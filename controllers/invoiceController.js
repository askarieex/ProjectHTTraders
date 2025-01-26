const {
  Invoice,
  InvoiceItem,
  Customer,
  Item,
  Transaction
} = require('../models');
const { Op } = require('sequelize');

/**
 * Helper Function to Adjust Customer Balance
 * @param {Object} customer - Customer instance
 * @param {String} transactionType - Type of transaction ('Credit', 'Debit', 'Refund')
 * @param {Number} amount - Transaction amount
 * @param {Boolean} increment - Whether to increment (true) or decrement (false) the balance
 * @param {Object} transaction - Sequelize transaction instance
 */
const adjustCustomerBalance = async (customer, transactionType, amount, increment = true, transaction) => {
  // Define how each transaction type affects the balance
  // - 'Credit' decreases the balance (customer pays)
  // - 'Debit' and 'Refund' increase the balance (money owed to the customer)
  let balanceChange = 0;

  switch (transactionType.toLowerCase()) {
    case 'credit':
      balanceChange = -amount;
      break;
    case 'debit':
    case 'refund':
      balanceChange = amount;
      break;
    default:
      throw new Error(`Unknown transaction type: ${transactionType}`);
  }

  if (!increment) {
    // If not incrementing, reverse the balance change
    balanceChange = -balanceChange;
  }

  customer.balance += balanceChange;
  await customer.save({ transaction });
};

// Helper to generate sequential invoice number
const generateSequentialInvoiceNumber = async () => {
  const lastInvoice = await Invoice.findOne({ order: [['createdAt', 'DESC']] });
  const lastSequence = lastInvoice
    ? parseInt(lastInvoice.invoiceNumber.split('-').pop())
    : 0;
  const year = new Date().getFullYear();
  const month = (`0${new Date().getMonth() + 1}`).slice(-2);
  const newSequence = lastSequence + 1;
  return `INV-${year}${month}-${`000${newSequence}`.slice(-3)}`;
};

// Create a new invoice (with Transaction creation logic)
exports.createInvoice = async (req, res) => {
  const sequelizeTxn = await Invoice.sequelize.transaction();
  try {
    const {
      invoiceDate,
      dueDate,
      discount,
      tax,
      taxType,
      currency,
      notes,
      paymentTerms,
      customer_id,
      items,

      // NEW FIELDS for transaction:
      paymentMethod, // e.g. 'Cash', 'Bank', 'Cheque', 'UPI', 'Net Banking'
      receivedAmount, // e.g. 100 (the amount received so far)
      invoicePendingAmount, // NEW FIELD for pending amount
    } = req.body;

    // Validate required fields
    if (!customer_id) {
      await sequelizeTxn.rollback();
      return res.status(400).json({ message: 'Customer ID is required.' });
    }

    // Generate a sequential invoice number
    const invoiceNumber = await generateSequentialInvoiceNumber();

    // Create Invoice
    const invoice = await Invoice.create(
      {
        invoiceNumber,
        invoiceDate,
        dueDate,
        discount,
        tax,
        taxType,
        currency,
        notes,
        paymentTerms,
        customer_id,
        total: 0, // Will update later

        // Add new fields:
        paymentMethod: paymentMethod || null,
        receivedAmount: parseFloat(receivedAmount) || 0,
        invoicePendingAmount: parseFloat(invoicePendingAmount) || 0, // Store pending amount
      },
      { transaction: sequelizeTxn }
    );

    let computedSubtotal = 0;

    // Create InvoiceItems + update stock
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await InvoiceItem.create(
          {
            invoice_id: invoice.id,
            item_id: item.item_id,
            category: item.category,
            name: item.name,
            dimension: item.dimension,
            selling_price: item.selling_price,
            unit: item.unit,
            quantity: item.quantity,
            subtotal: item.subtotal
          },
          { transaction: sequelizeTxn }
        );

        computedSubtotal += parseFloat(item.subtotal) || 0;

        // De-stock
        const stockItem = await Item.findByPk(item.item_id, {
          transaction: sequelizeTxn
        });
        if (!stockItem) {
          throw new Error(`Item with ID ${item.item_id} not found.`);
        }
        if (stockItem.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for item "${stockItem.name}".`
          );
        }
        stockItem.quantity -= item.quantity;
        await stockItem.save({ transaction: sequelizeTxn });
      }
    }

    // Calculate totals
    const discountVal = parseFloat(discount) || 0;
    const taxableAmount = computedSubtotal - discountVal;
    const taxVal = parseFloat(tax) || 0;
    const taxAmount = (taxVal / 100) * taxableAmount;
    const totalValue = taxableAmount + taxAmount;

    // Update the invoice total
    await invoice.update({ total: totalValue }, { transaction: sequelizeTxn });

    // -----------------------------------------------------------------
    //  TRANSACTION CREATION LOGIC
    // -----------------------------------------------------------------
    const parsedReceivedAmount = parseFloat(receivedAmount) || 0;
    const pendingAmount = totalValue - parsedReceivedAmount;

    // Determine the transactionStatus
    let transactionStatus = 'Pending';
    if (parsedReceivedAmount === 0) {
      transactionStatus = 'Pending';
    } else if (parsedReceivedAmount >= totalValue) {
      transactionStatus = 'Paid';
    } else {
      transactionStatus = 'Partially Paid';
    }

    // Build description from notes + paymentTerms
    let transactionDescription = 'Invoice payment';
    if (notes || paymentTerms) {
      transactionDescription = `${notes || ''} ${paymentTerms || ''}`.trim();
    }

    // GST details from tax
    const gstDetails = `Tax: ${tax || 0}%`;

    // Department can be static or from your logic, e.g. 'Sales'
    const department = 'Sales';

    // Create a transaction for the partial payment (if any)
    const invoiceTransaction = await Transaction.create(
      {
        customer_id,
        invoice_id: invoice.id,
        referenceId: null,
        transactionDate: new Date(),
        transactionType: 'Credit',
        amount: parsedReceivedAmount, // only what is actually paid now
        paymentMode: paymentMethod || 'Cash',
        pendingAmount,
        transactionStatus,
        description: transactionDescription,
        gstDetails,
        department,
        partyName: 'Default Party'
      },
      { transaction: sequelizeTxn, returning: false }
    );

    // Adjust the customer's balance:
    // 1) Add full invoice total to reflect what is owed
    const customer = await Customer.findByPk(customer_id, {
      transaction: sequelizeTxn
    });
    if (!customer) {
      throw new Error(`Customer with ID ${customer_id} not found.`);
    }
    customer.balance += totalValue;
    await customer.save({ transaction: sequelizeTxn });

    // 2) Subtract the partial payment from that
    await adjustCustomerBalance(
      customer,
      invoiceTransaction.transactionType,
      invoiceTransaction.amount,
      true,
      sequelizeTxn
    );

    // Commit all DB changes
    await sequelizeTxn.commit();

    // Fetch newly created invoice with associations
    const createdInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        {
          model: Customer,
          attributes: ['id', 'name', 'address', 'phone', 'email', 'balance']
        },
        {
          model: InvoiceItem,
          include: [
            {
              model: Item,
              attributes: [
                'id',
                'name',
                'category_id',
                'dimension',
                'selling_price',
                'unit'
              ]
            }
          ]
        }
      ]
    });

    res.status(201).json(createdInvoice);
  } catch (error) {
    await sequelizeTxn.rollback();
    console.error('Error creating invoice:', error);
    res.status(500).json({
      message: 'Error creating invoice',
      error: error.message
    });
  }
};

/**
 * Update an existing invoice
 */
exports.updateInvoice = async (req, res) => {
  const sequelizeTxn = await Invoice.sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      invoiceDate,
      dueDate,
      discount,
      tax,
      taxType,
      currency,
      notes,
      paymentTerms,
      customer_id,
      items,

      // Possibly updated fields
      paymentMethod,
      receivedAmount,
      invoicePendingAmount // NEW FIELD for pending amount
    } = req.body;

    // 1) Fetch existing invoice
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: InvoiceItem }],
      transaction: sequelizeTxn
    });
    if (!invoice) {
      await sequelizeTxn.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // 2) Re-stock old items
    for (const oldItem of invoice.InvoiceItems) {
      if (oldItem.item_id) {
        const itemToRestock = await Item.findByPk(oldItem.item_id, {
          transaction: sequelizeTxn
        });
        if (itemToRestock) {
          itemToRestock.quantity += oldItem.quantity;
          await itemToRestock.save({ transaction: sequelizeTxn });
        }
      }
    }

    // 3) Delete old invoice items
    await InvoiceItem.destroy({
      where: { invoice_id: invoice.id },
      transaction: sequelizeTxn
    });

    // 4) Create new items
    let computedSubtotal = 0;
    for (const newItemData of items) {
      await InvoiceItem.create(
        {
          invoice_id: invoice.id,
          item_id: newItemData.item_id,
          name: newItemData.name,
          category: newItemData.category,
          dimension: newItemData.dimension,
          selling_price: newItemData.selling_price,
          unit: newItemData.unit,
          quantity: newItemData.quantity,
          subtotal: newItemData.subtotal
        },
        { transaction: sequelizeTxn }
      );

      computedSubtotal += parseFloat(newItemData.subtotal) || 0;

      // De-stock new items
      if (newItemData.item_id) {
        const itemToDestock = await Item.findByPk(newItemData.item_id, {
          transaction: sequelizeTxn
        });
        if (!itemToDestock) {
          throw new Error(`Item with ID ${newItemData.item_id} not found.`);
        }
        if (itemToDestock.quantity < newItemData.quantity) {
          throw new Error(
            `Insufficient stock for item "${itemToDestock.name}".`
          );
        }
        itemToDestock.quantity -= newItemData.quantity;
        await itemToDestock.save({ transaction: sequelizeTxn });
      }
    }

    // 5) Recalculate total
    const discountVal = parseFloat(discount) || 0;
    const taxableAmount = computedSubtotal - discountVal;
    const taxVal = parseFloat(tax) || 0;
    const taxAmount = (taxVal / 100) * taxableAmount;
    const totalValue = taxableAmount + taxAmount;

    // 6) Update invoice
    await invoice.update(
      {
        invoiceDate,
        dueDate,
        discount,
        tax,
        taxType: taxType || 'GST',
        currency: currency || '₹',
        notes,
        paymentTerms,
        customer_id,
        total: totalValue,
        paymentMethod: paymentMethod || invoice.paymentMethod,
        receivedAmount:
          parseFloat(receivedAmount) || invoice.receivedAmount,
        invoicePendingAmount: parseFloat(invoicePendingAmount) || (totalValue - (parseFloat(receivedAmount) || 0)) // Update pending amount
      },
      { transaction: sequelizeTxn }
    );

    // -----------------------------------------------------------------
    //  UPDATE TRANSACTION LOGIC
    // -----------------------------------------------------------------
    const newReceivedAmount = parseFloat(receivedAmount) || 0;
    const newPendingAmount = totalValue - newReceivedAmount;

    let transactionStatus = 'Pending';
    if (newReceivedAmount === 0) {
      transactionStatus = 'Pending';
    } else if (newReceivedAmount >= totalValue) {
      transactionStatus = 'Paid';
    } else {
      transactionStatus = 'Partially Paid';
    }

    const existingTransaction = await Transaction.findOne({
      where: { invoice_id: invoice.id },
      transaction: sequelizeTxn
    });

    const customer = await Customer.findByPk(invoice.customer_id, {
      transaction: sequelizeTxn
    });
    if (!customer) {
      throw new Error(
        `Customer with ID ${invoice.customer_id} not found.`
      );
    }

    if (existingTransaction) {
      // Reverse the old partial payment
      const oldTransactionType = existingTransaction.transactionType;
      const oldAmount = existingTransaction.amount;
      await adjustCustomerBalance(
        customer,
        oldTransactionType,
        oldAmount,
        false,
        sequelizeTxn
      );

      // Update transaction
      existingTransaction.transactionType = 'Credit';
      existingTransaction.amount = newReceivedAmount;
      existingTransaction.pendingAmount = newPendingAmount;
      existingTransaction.transactionStatus = transactionStatus;
      existingTransaction.description = `${notes || ''} ${paymentTerms || ''
        }`.trim();
      existingTransaction.gstDetails = `Tax: ${tax || 0}%`;
      existingTransaction.paymentMode =
        paymentMethod || existingTransaction.paymentMode;

      await existingTransaction.save({ transaction: sequelizeTxn });

      // Apply the updated partial payment
      await adjustCustomerBalance(
        customer,
        existingTransaction.transactionType,
        existingTransaction.amount,
        true,
        sequelizeTxn
      );
    } else {
      // If no existing transaction, create one
      const newTxn = await Transaction.create(
        {
          customer_id: invoice.customer_id,
          invoice_id: invoice.id,
          referenceId: null,
          transactionDate: new Date(),
          transactionType: 'Credit',
          amount: newReceivedAmount,
          paymentMode: paymentMethod || 'Cash',
          pendingAmount: newPendingAmount,
          transactionStatus,
          description: `${notes || ''} ${paymentTerms || ''}`.trim(),
          gstDetails: `Tax: ${tax || 0}%`,
          department: 'Sales',
          partyName: 'Default Party'
        },
        { transaction: sequelizeTxn, returning: false }
      );

      // Adjust the customer's balance with this new partial payment
      await adjustCustomerBalance(
        customer,
        newTxn.transactionType,
        newTxn.amount,
        true,
        sequelizeTxn
      );
    }

    await sequelizeTxn.commit();

    // Fetch updated invoice
    const updatedInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        {
          model: Customer,
          attributes: ['id', 'name', 'address', 'phone', 'email', 'balance']
        },
        {
          model: InvoiceItem,
          include: [
            {
              model: Item,
              attributes: [
                'id',
                'name',
                'category_id',
                'dimension',
                'selling_price',
                'unit'
              ]
            }
          ]
        }
      ]
    });

    res.json(updatedInvoice);
  } catch (error) {
    await sequelizeTxn.rollback();
    console.error('Error updating invoice:', error);
    res.status(500).json({
      message: 'Error updating invoice',
      error: error.message
    });
  }
};

/**
 * Get invoice by ID
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [
        {
          model: Customer,
          attributes: ['id', 'name', 'address', 'phone', 'email', 'balance']
        },
        {
          model: InvoiceItem,
          include: [
            {
              model: Item,
              attributes: [
                'id',
                'name',
                'category_id',
                'dimension',
                'selling_price',
                'unit'
              ]
            }
          ]
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res
      .status(500)
      .json({ message: 'Error fetching invoice', error: error.message });
  }
};

/**
 * Get all invoices with optional filtering
 */
exports.getInvoices = async (req, res) => {
  try {
    const { customer_id, limit } = req.query;
    console.log('Fetching invoices for customer_id:', customer_id);

    const whereClause = {};
    if (customer_id) {
      whereClause.customer_id = customer_id;
    }

    const invoices = await Invoice.findAll({
      where: whereClause,
      limit: limit ? parseInt(limit, 10) : undefined,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Customer,
          attributes: ['id', 'name', 'address', 'phone', 'email', 'balance']
        },
        {
          model: InvoiceItem,
          include: [
            {
              model: Item,
              attributes: [
                'id',
                'name',
                'category_id',
                'dimension',
                'selling_price',
                'unit'
              ]
            }
          ]
        }
      ]
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res
      .status(500)
      .json({ message: 'Error fetching invoices', error: error.message });
  }
};

/**
 * Get the latest invoice number
 */
exports.getLatestInvoice = async (req, res) => {
  try {
    const latestInvoice = await Invoice.findOne({
      order: [['createdAt', 'DESC']]
    });

    if (!latestInvoice) {
      return res.status(200).json({ invoiceNumber: null });
    }

    res.status(200).json({ invoiceNumber: latestInvoice.invoiceNumber });
  } catch (error) {
    console.error('Error fetching latest invoice number:', error);
    res.status(500).json({
      message: 'Error fetching latest invoice number',
      error: error.message
    });
  }
};

/**
 * Delete an invoice
 */
exports.deleteInvoice = async (req, res) => {
  const sequelizeTxn = await Invoice.sequelize.transaction();
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      transaction: sequelizeTxn
    });
    if (!invoice) {
      await sequelizeTxn.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Fetch ALL associated transactions for partial payments
    const associatedTransactions = await Transaction.findAll({
      where: { invoice_id: invoice.id },
      transaction: sequelizeTxn
    });

    if (associatedTransactions && associatedTransactions.length > 0) {
      // We only need one instance of Customer to adjust
      const customer = await Customer.findByPk(invoice.customer_id, {
        transaction: sequelizeTxn
      });
      if (!customer) {
        throw new Error(`Customer with ID ${invoice.customer_id} not found.`);
      }

      // Reverse each partial payment
      // (e.g., if they paid ₹100, then ₹60, then ₹10, reverse each amount)
      for (const t of associatedTransactions) {
        await adjustCustomerBalance(
          customer,
          t.transactionType,
          t.amount,
          false,
          sequelizeTxn
        );
      }

      // Remove the entire "invoice.total" from the customer's balance,
      // since we originally ADDED it at invoice creation
      customer.balance -= invoice.total;

      // Example: Adjust other fields if you track them
      // e.g. customer.totalInvoices -= 1; etc.
      // Only do so if you actually store those.
      if (customer.totalInvoices !== undefined) {
        customer.totalInvoices -= 1;
      }
      // Summing partial payments might not be consistent, so skip if not used
      // e.g. customer.totalTransactions -= ?

      await customer.save({ transaction: sequelizeTxn });

      // Delete all transactions associated with this invoice
      for (const t of associatedTransactions) {
        await t.destroy({ transaction: sequelizeTxn });
      }

      // Finally, if no more transactions remain for the user, zero-out balance
      const remainingTxCount = await Transaction.count({
        where: { customer_id: invoice.customer_id },
        transaction: sequelizeTxn
      });
      if (remainingTxCount === 0) {
        customer.balance = 0;
        await customer.save({ transaction: sequelizeTxn });
      }
    }

    // Re-stock items
    const invoiceItems = await InvoiceItem.findAll({
      where: { invoice_id: invoice.id },
      transaction: sequelizeTxn
    });
    for (const item of invoiceItems) {
      if (item.item_id) {
        const stockItem = await Item.findByPk(item.item_id, {
          transaction: sequelizeTxn
        });
        if (stockItem) {
          stockItem.quantity += item.quantity;
          await stockItem.save({ transaction: sequelizeTxn });
        }
      }
    }

    // Delete the invoice items
    await InvoiceItem.destroy({
      where: { invoice_id: invoice.id },
      transaction: sequelizeTxn
    });

    // Finally, delete the invoice
    await invoice.destroy({ transaction: sequelizeTxn });

    await sequelizeTxn.commit();
    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    await sequelizeTxn.rollback();
    console.error('Error deleting invoice:', error);
    res
      .status(500)
      .json({ message: 'Error deleting invoice', error: error.message });
  }
};

/**
 * **NEW FUNCTION**: Get total number of invoices for a specific customer by customer ID
 */
exports.getTotalInvoicesByUser = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required.' });
    }

    // Verify that the customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ message: `Customer with ID ${customerId} not found.` });
    }

    // Count the total number of invoices for the customer
    const totalInvoices = await Invoice.count({
      where: { customer_id: customerId }
    });

    res.json({ customerId, totalInvoices });
  } catch (error) {
    console.error('Error fetching total invoices for user:', error);
    res.status(500).json({
      message: 'Error fetching total invoices for user',
      error: error.message
    });
  }
};

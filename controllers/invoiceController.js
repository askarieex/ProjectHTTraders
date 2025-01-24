// controllers/invoiceController.js

const {
  Invoice,
  InvoiceItem,
  Customer,
  Item,
  Transaction
} = require('../models');
const { Op } = require('sequelize');

// Helper to generate sequential invoice number
const generateSequentialInvoiceNumber = async () => {
  const lastInvoice = await Invoice.findOne({ order: [['createdAt', 'DESC']] });
  const lastSequence = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-').pop()) : 0;
  const year = new Date().getFullYear();
  const month = (`0${new Date().getMonth() + 1}`).slice(-2);
  const newSequence = lastSequence + 1;
  return `INV-${year}${month}-${`000${newSequence}`.slice(-3)}`;
};

// Create a new invoice (with Transaction creation logic)
exports.createInvoice = async (req, res) => {
  const transaction = await Invoice.sequelize.transaction();
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
      paymentMethod,   // e.g. 'Cash', 'Bank', 'Cheque', 'UPI', 'Net Banking'
      receivedAmount   // e.g. 700 (the amount received so far)
    } = req.body;

    // Validate required fields
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }

    // Generate a sequential invoice number
    const invoiceNumber = await generateSequentialInvoiceNumber();

    // Create Invoice (total = 0 initially)
    const invoice = await Invoice.create({
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
      total: 0,

      // Add new fields:
      paymentMethod: paymentMethod || null,
      receivedAmount: parseFloat(receivedAmount) || 0

    }, { transaction });

    let computedSubtotal = 0;

    // Create InvoiceItems + update stock
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await InvoiceItem.create({
          invoice_id: invoice.id,
          item_id: item.item_id,
          category: item.category,
          name: item.name,
          dimension: item.dimension,
          selling_price: item.selling_price,
          unit: item.unit,
          quantity: item.quantity,
          subtotal: item.subtotal
        }, { transaction });

        computedSubtotal += parseFloat(item.subtotal) || 0;

        // De-stock
        const stockItem = await Item.findByPk(item.item_id, { transaction });
        if (!stockItem) {
          throw new Error(`Item with ID ${item.item_id} not found.`);
        }
        if (stockItem.quantity < item.quantity) {
          throw new Error(`Insufficient stock for item "${stockItem.name}".`);
        }
        stockItem.quantity -= item.quantity;
        await stockItem.save({ transaction });
      }
    }

    // Calculate totals
    const discountVal = parseFloat(discount) || 0;
    const taxableAmount = computedSubtotal - discountVal;
    const taxVal = parseFloat(tax) || 0;
    const taxAmount = (taxVal / 100) * taxableAmount;
    const totalValue = taxableAmount + taxAmount;

    // Update the invoice total
    await invoice.update({ total: totalValue }, { transaction });

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

    // Build description from notes + paymentTerms (fallback if empty)
    let transactionDescription = 'Invoice payment';
    if (notes || paymentTerms) {
      transactionDescription = `${notes || ''} ${paymentTerms || ''}`.trim();
    }

    // GST details from tax
    const gstDetails = `Tax: ${tax || 0}%`;

    // Department can be static or from your logic, e.g. 'Sales'
    const department = 'Sales';

    // Create a new Transaction record without returning data
    await Transaction.create({
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      referenceId: null,
      transactionDate: new Date(),
      transactionType: 'Credit',
      amount: totalValue,
      paymentMode: paymentMethod || 'Cash',
      pendingAmount,
      transactionStatus,
      description: transactionDescription,
      gstDetails,
      department,
      partyName: "Default Party"
    }, { transaction, returning: false });

    // -----------------------------------------------------------------

    // Update Customer's balance
    const customer = await Customer.findByPk(customer_id, { transaction });
    if (!customer) {
      throw new Error(`Customer with ID ${customer_id} not found.`);
    }

    // Increment totalInvoices and totalTransactions if needed
    customer.totalInvoices += 1;
    customer.totalTransactions += totalValue;

    // Update balance: balance += pendingAmount
    customer.balance += pendingAmount;
    await customer.save({ transaction });

    // Commit all DB changes
    await transaction.commit();

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
              attributes: ['id', 'name', 'category_id', 'dimension', 'selling_price', 'unit']
            }
          ]
        }
      ]
    });

    res.status(201).json(createdInvoice);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating invoice:", error);
    res.status(500).json({ message: 'Error creating invoice', error: error.message });
  }
};

// Update an existing invoice
exports.updateInvoice = async (req, res) => {
  const transaction = await Invoice.sequelize.transaction();
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

      // NEW FIELDS for transaction (if applicable)
      paymentMethod,   // e.g. 'Cash', 'Bank', 'Cheque', 'UPI', 'Net Banking'
      receivedAmount   // e.g. 700 (the amount received so far)
    } = req.body;

    // 1) Fetch existing invoice
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: InvoiceItem }],
      transaction
    });
    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // 2) Re-stock old items
    for (const oldItem of invoice.InvoiceItems) {
      if (oldItem.item_id) {
        const itemToRestock = await Item.findByPk(oldItem.item_id, { transaction });
        if (itemToRestock) {
          itemToRestock.quantity += oldItem.quantity;
          await itemToRestock.save({ transaction });
        }
      }
    }

    // 3) Delete old invoice items
    await InvoiceItem.destroy({
      where: { invoice_id: invoice.id },
      transaction
    });

    // 4) Create new items
    let computedSubtotal = 0;
    for (const newItemData of items) {
      await InvoiceItem.create({
        invoice_id: invoice.id,
        item_id: newItemData.item_id || null,
        name: newItemData.name,
        category: newItemData.category,
        dimension: newItemData.dimension,
        selling_price: newItemData.selling_price,
        unit: newItemData.unit,
        quantity: newItemData.quantity,
        subtotal: newItemData.subtotal
      }, { transaction });

      computedSubtotal += parseFloat(newItemData.subtotal) || 0;

      // De-stock
      if (newItemData.item_id) {
        const itemToDestock = await Item.findByPk(newItemData.item_id, { transaction });
        if (!itemToDestock) {
          throw new Error(`Item with ID ${newItemData.item_id} not found.`);
        }
        if (itemToDestock.quantity < newItemData.quantity) {
          throw new Error(`Insufficient stock for item "${itemToDestock.name}".`);
        }
        itemToDestock.quantity -= newItemData.quantity;
        await itemToDestock.save({ transaction });
      }
    }

    // 5) Recalculate total
    const discountVal = parseFloat(discount) || 0;
    const taxableAmount = computedSubtotal - discountVal;
    const taxVal = parseFloat(tax) || 0;
    const taxAmount = (taxVal / 100) * taxableAmount;
    const totalValue = taxableAmount + taxAmount;

    // 6) Update invoice
    await invoice.update({
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
      // Optionally update paymentMethod and receivedAmount if provided
      paymentMethod: paymentMethod || invoice.paymentMethod,
      receivedAmount: parseFloat(receivedAmount) || invoice.receivedAmount
    }, { transaction });

    // -----------------------------------------------------------------
    //  UPDATE TRANSACTION LOGIC HERE
    // -----------------------------------------------------------------

    // Calculate new pending amount
    const newReceivedAmount = parseFloat(receivedAmount) || 0;
    const newPendingAmount = totalValue - newReceivedAmount;

    // Determine the new transactionStatus
    let transactionStatus = 'Pending';
    if (newReceivedAmount === 0) {
      transactionStatus = 'Pending';
    } else if (newReceivedAmount >= totalValue) {
      transactionStatus = 'Paid';
    } else {
      transactionStatus = 'Partially Paid';
    }

    // Fetch existing Transaction associated with the invoice
    const existingTransaction = await Transaction.findOne({
      where: { invoice_id: invoice.id },
      transaction
    });

    if (existingTransaction) {
      // Calculate difference in pending amount
      const oldPendingAmount = existingTransaction.pendingAmount;
      const difference = newPendingAmount - oldPendingAmount;

      // Update transaction
      await existingTransaction.update({
        amount: totalValue,
        pendingAmount: newPendingAmount,
        transactionStatus,
        description: `${notes || ''} ${paymentTerms || ''}`.trim(),
        gstDetails: `Tax: ${tax || 0}%`,
        paymentMode: paymentMethod || existingTransaction.paymentMode
      }, { transaction });

      // Update Customer's balance
      const customer = await Customer.findByPk(customer_id, { transaction });
      if (!customer) {
        throw new Error(`Customer with ID ${customer_id} not found.`);
      }

      // Adjust balance based on difference
      customer.balance += difference;
      await customer.save({ transaction });

    } else {
      // If no existing transaction, create one
      await Transaction.create({
        customer_id: invoice.customer_id,
        invoice_id: invoice.id,
        referenceId: null,
        transactionDate: new Date(),
        transactionType: 'Credit',
        amount: totalValue,
        paymentMode: paymentMethod || 'Cash',
        pendingAmount: newPendingAmount,
        transactionStatus,
        description: `${notes || ''} ${paymentTerms || ''}`.trim(),
        gstDetails: `Tax: ${tax || 0}%`,
        department: 'Sales',
        partyName: "Default Party"
      }, { transaction, returning: false });

      // Update Customer's balance
      const customer = await Customer.findByPk(customer_id, { transaction });
      if (!customer) {
        throw new Error(`Customer with ID ${customer_id} not found.`);
      }

      // Update balance: balance += newPendingAmount
      customer.balance += newPendingAmount;
      customer.totalInvoices += 1; // If applicable
      customer.totalTransactions += totalValue;
      await customer.save({ transaction });
    }

    // -----------------------------------------------------------------

    await transaction.commit();

    // Fetch updated invoice with associations
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
              attributes: ['id', 'name', 'category_id', 'dimension', 'selling_price', 'unit']
            }
          ]
        }
      ]
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    await transaction.rollback();
    return res.status(500).json({
      message: 'Error updating invoice',
      error: error.message
    });
  }
};

// Get invoice by ID
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
              attributes: ['id', 'name', 'category_id', 'dimension', 'selling_price', 'unit']
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
    console.error("Error fetching invoice:", error);
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
};

// Get all invoices with optional filtering
exports.getInvoices = async (req, res) => {
  try {
    const { customer_id, limit } = req.query;
    console.log("Fetching invoices for customer_id:", customer_id);

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
              attributes: ['id', 'name', 'category_id', 'dimension', 'selling_price', 'unit']
            }
          ]
        }
      ]
    });

    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
};

// Get the latest invoice number
exports.getLatestInvoice = async (req, res) => {
  try {
    const latestInvoice = await Invoice.findOne({
      order: [['createdAt', 'DESC']],
    });

    if (!latestInvoice) {
      return res.status(200).json({ invoiceNumber: null });
    }

    res.status(200).json({ invoiceNumber: latestInvoice.invoiceNumber });
  } catch (error) {
    console.error("Error fetching latest invoice number:", error);
    res.status(500).json({ message: 'Error fetching latest invoice number', error: error.message });
  }
};

// Delete an invoice
exports.deleteInvoice = async (req, res) => {
  const transaction = await Invoice.sequelize.transaction();
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Transaction }],
      transaction
    });
    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Fetch associated transaction
    const associatedTransaction = await Transaction.findOne({
      where: { invoice_id: invoice.id },
      transaction
    });

    // Adjust Customer's balance
    if (associatedTransaction) {
      const customer = await Customer.findByPk(invoice.customer_id, { transaction });
      if (!customer) {
        throw new Error(`Customer with ID ${invoice.customer_id} not found.`);
      }

      // Decrement balance by the pending amount of this invoice
      customer.balance -= associatedTransaction.pendingAmount;
      customer.totalInvoices -= 1;
      customer.totalTransactions -= associatedTransaction.amount;
      await customer.save({ transaction });

      // Delete the transaction
      await associatedTransaction.destroy({ transaction });
    }

    // Re-stock items
    const invoiceItems = await InvoiceItem.findAll({
      where: { invoice_id: invoice.id },
      transaction
    });

    for (const item of invoiceItems) {
      if (item.item_id) {
        const stockItem = await Item.findByPk(item.item_id, { transaction });
        if (stockItem) {
          stockItem.quantity += item.quantity;
          await stockItem.save({ transaction });
        }
      }
    }

    // Delete the invoice items
    await InvoiceItem.destroy({
      where: { invoice_id: invoice.id },
      transaction
    });

    // Finally, delete the invoice
    await invoice.destroy({ transaction });

    await transaction.commit();
    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    await transaction.rollback();
    res.status(500).json({ message: 'Error deleting invoice', error: error.message });
  }
};

/**
 * **NEW FUNCTION**: Get total number of invoices for a specific customer by customer ID
 */
exports.getTotalInvoicesByUser = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Validate customerId
    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required.' });
    }

    // Verify that the customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: `Customer with ID ${customerId} not found.` });
    }

    // Count the total number of invoices for the customer
    const totalInvoices = await Invoice.count({
      where: { customer_id: customerId }
    });

    res.json({ customerId, totalInvoices });
  } catch (error) {
    console.error("Error fetching total invoices for user:", error);
    res.status(500).json({ message: 'Error fetching total invoices for user', error: error.message });
  }
};
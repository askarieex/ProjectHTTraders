const { Transaction, Customer /*, Invoice */ } = require('../models');

/**
 * Get all transactions
 */
exports.getAllTransactions = async (req, res) => {
  try {
    // Include Customer info and exclude non-existent 'item_id' column
    const transactions = await Transaction.findAll({
      include: [
        { model: Customer, attributes: ['id', 'name', 'phone'] }
        // If you want invoice info: { model: Invoice, attributes: ['id', 'invoiceNumber'] }
      ],
      attributes: { exclude: ['item_id'] }  // Exclude the item_id column
    });
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
};

/**
 * Create a new transaction
 */
exports.createTransaction = async (req, res) => {
  try {
    const {
      customer_id,
      invoice_id,
      referenceId,
      transactionDate,
      transactionType,
      amount,
      paymentMode,
      pendingAmount,
      transactionStatus,
      description,
      gstDetails,
      department
    } = req.body;

    // Validate required fields
    if (!customer_id) {
      return res.status(400).json({ message: 'customer_id is required.' });
    }
    if (!transactionDate || !transactionType || amount === undefined || !paymentMode || !transactionStatus) {
      return res.status(400).json({
        message: 'transactionDate, transactionType, amount, paymentMode, and transactionStatus are required.'
      });
    }

    // Verify the customer exists
    const customer = await Customer.findByPk(customer_id);
    if (!customer) {
      return res.status(404).json({ message: `Customer with ID ${customer_id} not found.` });
    }

    // Create the transaction
    const newTransaction = await Transaction.create({
      customer_id,
      invoice_id,
      referenceId,
      transactionDate,
      transactionType,
      amount,
      paymentMode,
      pendingAmount,
      transactionStatus,
      description,
      gstDetails,
      department
    });

    res.status(201).json(newTransaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: 'Error creating transaction', error: error.message });
  }
};

/**
 * Get a single transaction by ID
 */
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    // Include Customer info and exclude non-existent 'item_id' column
    const transaction = await Transaction.findByPk(id, {
      include: [
        { model: Customer, attributes: ['id', 'name', 'phone'] }
      ],
      attributes: { exclude: ['item_id'] }  // Exclude the item_id column
    });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    res.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ message: 'Error fetching transaction', error: error.message });
  }
};

/**
 * Update a transaction
 */
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const {
      customer_id,
      invoice_id,
      referenceId,
      transactionDate,
      transactionType,
      amount,
      paymentMode,
      pendingAmount,
      transactionStatus,
      description,
      gstDetails,
      department
    } = req.body;

    // If customer_id changes, check if new customer exists:
    if (customer_id && customer_id !== transaction.customer_id) {
      const newCustomer = await Customer.findByPk(customer_id);
      if (!newCustomer) {
        return res.status(404).json({ message: `Customer with ID ${customer_id} not found.` });
      }
    }

    // Update the transaction fields
    await transaction.update({
      customer_id: customer_id !== undefined ? customer_id : transaction.customer_id,
      invoice_id: invoice_id !== undefined ? invoice_id : transaction.invoice_id,
      referenceId: referenceId !== undefined ? referenceId : transaction.referenceId,
      transactionDate: transactionDate !== undefined ? transactionDate : transaction.transactionDate,
      transactionType: transactionType !== undefined ? transactionType : transaction.transactionType,
      amount: amount !== undefined ? amount : transaction.amount,
      paymentMode: paymentMode !== undefined ? paymentMode : transaction.paymentMode,
      pendingAmount: pendingAmount !== undefined ? pendingAmount : transaction.pendingAmount,
      transactionStatus: transactionStatus !== undefined ? transactionStatus : transaction.transactionStatus,
      description: description !== undefined ? description : transaction.description,
      gstDetails: gstDetails !== undefined ? gstDetails : transaction.gstDetails,
      department: department !== undefined ? department : transaction.department
    });

    res.json(transaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: 'Error updating transaction', error: error.message });
  }
};

/**
 * Delete a transaction
 */
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    await transaction.destroy();
    res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ message: 'Error deleting transaction', error: error.message });
  }
};

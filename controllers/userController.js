// controllers/transactionController.js

const { Transaction, Invoice } = require('../models');
// If you want to modify invoice totals or statuses, you can require the Invoice model here.

exports.getAllTransactions = async (req, res) => {
  try {
    // If you want, you can also include Invoice info here via "include: [ Invoice ]"
    const transactions = await Transaction.findAll();
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const {
      invoice_id,
      referenceId,
      partyName,
      transactionDate,
      transactionType,
      amount,
      paymentMode,
      pendingAmount,
      transactionStatus,
      description,
      gstDetails,
      department,
      category,
      paymentTerms,
      linkedDocuments,
      transactionCategory,
      updatedBy
    } = req.body;

    // Validate required fields:
    if (!partyName || !transactionDate || !transactionType || amount === undefined || !paymentMode || !transactionStatus) {
      return res.status(400).json({ message: 'Missing required fields (e.g., partyName, date, type, amount, etc.)' });
    }

    // Example partial logic: If invoice_id is given, you could locate the invoice and adjust its status or total.
    // e.g.:
    /*
    if (invoice_id) {
      const invoice = await Invoice.findByPk(invoice_id);
      if (!invoice) {
        return res.status(400).json({ message: `Invoice with ID ${invoice_id} not found.` });
      }
      // Possibly update invoice paid amounts or statuses here if desired
    }
    */

    const newTransaction = await Transaction.create({
      invoice_id,
      referenceId,
      partyName,
      transactionDate,
      transactionType,
      amount,
      paymentMode,
      pendingAmount,
      transactionStatus,
      description,
      gstDetails,
      department,
      category,
      paymentTerms,
      linkedDocuments,
      transactionCategory,
      updatedBy
    });

    res.status(201).json(newTransaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: 'Error creating transaction', error: error.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    // Optionally include invoice:
    // const transaction = await Transaction.findByPk(id, { include: [Invoice] });
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    res.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ message: 'Error fetching transaction', error: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const {
      invoice_id,
      referenceId,
      partyName,
      transactionDate,
      transactionType,
      amount,
      paymentMode,
      pendingAmount,
      transactionStatus,
      description,
      gstDetails,
      department,
      category,
      paymentTerms,
      linkedDocuments,
      transactionCategory,
      updatedBy
    } = req.body;

    // If invoice_id changed, you could do logic here to re-link or handle partial invoice updates.

    await transaction.update({
      invoice_id: (invoice_id !== undefined) ? invoice_id : transaction.invoice_id,
      referenceId: (referenceId !== undefined) ? referenceId : transaction.referenceId,
      partyName: (partyName !== undefined) ? partyName : transaction.partyName,
      transactionDate: (transactionDate !== undefined) ? transactionDate : transaction.transactionDate,
      transactionType: (transactionType !== undefined) ? transactionType : transaction.transactionType,
      amount: (amount !== undefined) ? amount : transaction.amount,
      paymentMode: (paymentMode !== undefined) ? paymentMode : transaction.paymentMode,
      pendingAmount: (pendingAmount !== undefined) ? pendingAmount : transaction.pendingAmount,
      transactionStatus: (transactionStatus !== undefined) ? transactionStatus : transaction.transactionStatus,
      description: (description !== undefined) ? description : transaction.description,
      gstDetails: (gstDetails !== undefined) ? gstDetails : transaction.gstDetails,
      department: (department !== undefined) ? department : transaction.department,
      category: (category !== undefined) ? category : transaction.category,
      paymentTerms: (paymentTerms !== undefined) ? paymentTerms : transaction.paymentTerms,
      linkedDocuments: (linkedDocuments !== undefined) ? linkedDocuments : transaction.linkedDocuments,
      transactionCategory: (transactionCategory !== undefined) ? transactionCategory : transaction.transactionCategory,
      updatedBy: (updatedBy !== undefined) ? updatedBy : transaction.updatedBy
    });

    res.json(transaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: 'Error updating transaction', error: error.message });
  }
};

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

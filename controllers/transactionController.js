// controllers/transactionController.js

const { Transaction, Customer, Invoice } = require('../models');
const { Op } = require('sequelize');

/**
 * Helper Function to Adjust Customer Balance
 * @param {Object} customer - Customer instance
 * @param {String} transactionType - Type of transaction ('Credit', 'Debit', 'Refund')
 * @param {Number} amount - Transaction amount
 * @param {Boolean} increment - Whether to increment (true) or decrement (false) the balance
 * @param {Object} transaction - Sequelize transaction instance
 */
const adjustCustomerBalance = async (
    customer,
    transactionType,
    amount,
    increment = true,
    transaction = null
) => {
    // Define how each transaction type affects the balance
    // - 'Credit' decreases the balance (customer pays)
    // - 'Debit' and 'Refund' increase the balance (money owed to customer)
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

/**
 * Get all transactions, with optional filtering by customer_id and/or invoice_id
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const { customer_id, invoice_id } = req.query;

        // Build a dynamic WHERE clause
        const whereClause = {};
        if (customer_id) {
            whereClause.customer_id = customer_id;
        }
        if (invoice_id) {
            whereClause.invoice_id = invoice_id;
        }

        // Include Customer and Invoice info
        const transactions = await Transaction.findAll({
            where: whereClause,
            include: [
                {
                    model: Customer,
                    as: 'customer', // Ensure this matches your model associations
                    attributes: ['id', 'name', 'phone', 'email']
                },
                {
                    model: Invoice,
                    as: 'invoice', // Ensure this matches your model associations
                    attributes: ['id', 'invoiceNumber', 'total', 'invoicePendingAmount']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            message: 'Error fetching transactions',
            error: error.message
        });
    }
};

/**
 * Create a new transaction
 */
exports.createTransaction = async (req, res) => {
    const sequelizeTxn = await Transaction.sequelize.transaction();
    try {
        const {
            customer_id,
            invoice_id,
            referenceId,
            transactionDate,
            transactionType, // 'Credit' | 'Debit' | 'Refund'
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
            await sequelizeTxn.rollback();
            return res.status(400).json({ message: 'customer_id is required.' });
        }
        if (
            !transactionDate ||
            !transactionType ||
            amount === undefined ||
            !paymentMode ||
            !transactionStatus
        ) {
            await sequelizeTxn.rollback();
            return res.status(400).json({
                message:
                    'transactionDate, transactionType, amount, paymentMode, and transactionStatus are required.'
            });
        }

        // Verify the customer exists
        const customer = await Customer.findByPk(customer_id, {
            transaction: sequelizeTxn
        });
        if (!customer) {
            await sequelizeTxn.rollback();
            return res.status(404).json({
                message: `Customer with ID ${customer_id} not found.`
            });
        }

        // If invoice_id is provided, ensure the invoice exists
        let invoice = null;
        if (invoice_id) {
            invoice = await Invoice.findByPk(invoice_id, {
                transaction: sequelizeTxn
            });
            if (!invoice) {
                await sequelizeTxn.rollback();
                return res.status(404).json({
                    message: `Invoice with ID ${invoice_id} not found.`
                });
            }
        }

        // Create the transaction
        const newTransaction = await Transaction.create(
            {
                customer_id,
                invoice_id: invoice_id || null,
                referenceId: referenceId || null,
                transactionDate,
                transactionType,
                amount,
                paymentMode,
                pendingAmount: pendingAmount || 0,
                transactionStatus,
                description: description || null,
                gstDetails: gstDetails || null,
                department: department || null
            },
            { transaction: sequelizeTxn }
        );

        // Adjust the customer's balance based on transaction type and amount
        await adjustCustomerBalance(
            customer,
            transactionType,
            amount,
            true,
            sequelizeTxn
        );

        // **NEW CODE: Update invoicePendingAmount if invoice_id is provided**
        if (invoice_id && invoice) {
            // Calculate new pending amount
            let newPendingAmount = invoice.invoicePendingAmount - amount;

            // Ensure newPendingAmount is not negative
            if (newPendingAmount < 0) {
                await sequelizeTxn.rollback();
                return res.status(400).json({
                    message: 'Transaction amount exceeds the pending invoice amount.'
                });
            }

            // Update invoicePendingAmount
            await invoice.update(
                { invoicePendingAmount: newPendingAmount },
                { transaction: sequelizeTxn }
            );
        }

        await sequelizeTxn.commit();
        res.status(201).json(newTransaction);
    } catch (error) {
        await sequelizeTxn.rollback();
        console.error('Error creating transaction:', error);
        res.status(500).json({
            message: 'Error creating transaction',
            error: error.message
        });
    }
};

/**
 * Get a single transaction by ID
 */
exports.getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findByPk(id, {
            include: [
                {
                    model: Customer,
                    as: 'customer', // Ensure this matches your model associations
                    attributes: ['id', 'name', 'phone', 'email']
                },
                {
                    model: Invoice,
                    as: 'invoice', // Ensure this matches your model associations
                    attributes: ['id', 'invoiceNumber', 'total', 'invoicePendingAmount']
                }
            ]
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }
        res.json(transaction);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({
            message: 'Error fetching transaction',
            error: error.message
        });
    }
};

/**
 * Update a transaction
 */
exports.updateTransaction = async (req, res) => {
    const sequelizeTxn = await Transaction.sequelize.transaction();
    try {
        const { id } = req.params;
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

        // Fetch existing transaction
        const existingTransaction = await Transaction.findByPk(id, {
            transaction: sequelizeTxn
        });

        if (!existingTransaction) {
            await sequelizeTxn.rollback();
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        // Store old values for balance and invoice adjustment
        const oldTransactionType = existingTransaction.transactionType;
        const oldAmount = existingTransaction.amount;
        const oldInvoiceId = existingTransaction.invoice_id;

        // If customer_id changes, verify the new customer exists
        let newCustomer = existingTransaction.customer_id;
        if (customer_id && customer_id !== existingTransaction.customer_id) {
            const customer = await Customer.findByPk(customer_id, {
                transaction: sequelizeTxn
            });
            if (!customer) {
                await sequelizeTxn.rollback();
                return res.status(404).json({
                    message: `Customer with ID ${customer_id} not found.`
                });
            }
            newCustomer = customer;
        } else {
            newCustomer = await Customer.findByPk(existingTransaction.customer_id, {
                transaction: sequelizeTxn
            });
        }

        // If invoice_id changes, verify the new invoice exists
        let newInvoice = existingTransaction.invoice_id;
        if (invoice_id && invoice_id !== existingTransaction.invoice_id) {
            const invoice = await Invoice.findByPk(invoice_id, {
                transaction: sequelizeTxn
            });
            if (!invoice) {
                await sequelizeTxn.rollback();
                return res.status(404).json({
                    message: `Invoice with ID ${invoice_id} not found.`
                });
            }
            newInvoice = invoice;
        } else if (existingTransaction.invoice_id) {
            newInvoice = await Invoice.findByPk(existingTransaction.invoice_id, {
                transaction: sequelizeTxn
            });
        }

        // Update the transaction fields
        await existingTransaction.update(
            {
                customer_id:
                    customer_id !== undefined ? customer_id : existingTransaction.customer_id,
                invoice_id:
                    invoice_id !== undefined ? invoice_id : existingTransaction.invoice_id,
                referenceId:
                    referenceId !== undefined ? referenceId : existingTransaction.referenceId,
                transactionDate:
                    transactionDate !== undefined
                        ? transactionDate
                        : existingTransaction.transactionDate,
                transactionType:
                    transactionType !== undefined
                        ? transactionType
                        : existingTransaction.transactionType,
                amount:
                    amount !== undefined ? amount : existingTransaction.amount,
                paymentMode:
                    paymentMode !== undefined
                        ? paymentMode
                        : existingTransaction.paymentMode,
                pendingAmount:
                    pendingAmount !== undefined
                        ? pendingAmount
                        : existingTransaction.pendingAmount,
                transactionStatus:
                    transactionStatus !== undefined
                        ? transactionStatus
                        : existingTransaction.transactionStatus,
                description:
                    description !== undefined
                        ? description
                        : existingTransaction.description,
                gstDetails:
                    gstDetails !== undefined
                        ? gstDetails
                        : existingTransaction.gstDetails,
                department:
                    department !== undefined
                        ? department
                        : existingTransaction.department
            },
            { transaction: sequelizeTxn }
        );

        // Adjust the customer's balance
        // Reverse the old transaction
        await adjustCustomerBalance(
            newCustomer,
            oldTransactionType,
            oldAmount,
            false,
            sequelizeTxn
        );

        // Apply the new transaction
        const newTransType = transactionType !== undefined ? transactionType : oldTransactionType;
        const newTransAmount = amount !== undefined ? amount : oldAmount;
        await adjustCustomerBalance(
            newCustomer,
            newTransType,
            newTransAmount,
            true,
            sequelizeTxn
        );

        // **NEW CODE: Update invoicePendingAmount**

        // Handle invoicePendingAmount based on changes in invoice_id and amount
        if (invoice_id && invoice_id !== oldInvoiceId) {
            // If invoice_id has changed, revert the old invoice's pending amount and update the new one
            if (oldInvoiceId) {
                const oldInvoice = await Invoice.findByPk(oldInvoiceId, {
                    transaction: sequelizeTxn
                });
                if (oldInvoice) {
                    const revertedPendingAmount = oldInvoice.invoicePendingAmount + oldAmount;
                    await oldInvoice.update(
                        { invoicePendingAmount: revertedPendingAmount },
                        { transaction: sequelizeTxn }
                    );
                }
            }

            // Update the new invoice's pending amount
            if (newInvoice) {
                const updatedPendingAmount = newInvoice.invoicePendingAmount - newTransAmount;

                if (updatedPendingAmount < 0) {
                    await sequelizeTxn.rollback();
                    return res.status(400).json({
                        message: 'Updated transaction amount exceeds the pending invoice amount.'
                    });
                }

                await newInvoice.update(
                    { invoicePendingAmount: updatedPendingAmount },
                    { transaction: sequelizeTxn }
                );
            }
        } else if (existingTransaction.invoice_id) {
            // If invoice_id didn't change, adjust pending amount based on amount difference
            const invoice = await Invoice.findByPk(existingTransaction.invoice_id, {
                transaction: sequelizeTxn
            });
            if (invoice) {
                const amountDifference = newTransAmount - oldAmount;
                const updatedPendingAmount = invoice.invoicePendingAmount - amountDifference;

                if (updatedPendingAmount < 0) {
                    await sequelizeTxn.rollback();
                    return res.status(400).json({
                        message: 'Updated transaction amount exceeds the pending invoice amount.'
                    });
                }

                await invoice.update(
                    { invoicePendingAmount: updatedPendingAmount },
                    { transaction: sequelizeTxn }
                );
            }
        }

        await sequelizeTxn.commit();
        res.json(existingTransaction);
    } catch (error) {
        await sequelizeTxn.rollback();
        console.error('Error updating transaction:', error);
        res.status(500).json({
            message: 'Error updating transaction',
            error: error.message
        });
    }
};

/**
 * Delete a transaction
 */
exports.deleteTransaction = async (req, res) => {
    const sequelizeTxn = await Transaction.sequelize.transaction();
    try {
        const { id } = req.params;
        const transactionToDelete = await Transaction.findByPk(id, {
            transaction: sequelizeTxn
        });

        if (!transactionToDelete) {
            await sequelizeTxn.rollback();
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        const { customer_id, transactionType, amount, invoice_id } = transactionToDelete;

        // Fetch the customer
        const customer = await Customer.findByPk(customer_id, { transaction: sequelizeTxn });
        if (!customer) {
            await sequelizeTxn.rollback();
            return res.status(404).json({
                message: `Customer with ID ${customer_id} not found.`
            });
        }

        // Reverse the transaction's effect on the customer's balance
        await adjustCustomerBalance(
            customer,
            transactionType,
            amount,
            false,
            sequelizeTxn
        );

        // If the transaction is linked to an invoice, update the invoicePendingAmount
        if (invoice_id) {
            const invoice = await Invoice.findByPk(invoice_id, { transaction: sequelizeTxn });
            if (invoice) {
                let newPendingAmount = invoice.invoicePendingAmount + amount;

                // Ensure newPendingAmount does not exceed total
                if (newPendingAmount > invoice.total) {
                    newPendingAmount = invoice.total;
                }

                await invoice.update(
                    { invoicePendingAmount: newPendingAmount },
                    { transaction: sequelizeTxn }
                );
            }
        }

        // Delete the transaction
        await transactionToDelete.destroy({ transaction: sequelizeTxn });

        // If no more transactions remain for the customer, set balance to 0
        const remainingTransactions = await Transaction.count({
            where: { customer_id: customer_id },
            transaction: sequelizeTxn
        });
        if (remainingTransactions === 0) {
            customer.balance = 0;
            await customer.save({ transaction: sequelizeTxn });
        }

        await sequelizeTxn.commit();
        res.json({ message: 'Transaction deleted successfully.' });
    } catch (error) {
        await sequelizeTxn.rollback();
        console.error('Error deleting transaction:', error);
        res.status(500).json({
            message: 'Error deleting transaction',
            error: error.message
        });
    }
};

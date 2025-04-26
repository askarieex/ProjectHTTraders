// controllers/customerController.js
const { Customer, Invoice, InvoiceItem, Item, sequelize } = require('../models');

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
      },
    });
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
};

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const { name, address, phone, email, balance } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required.' });
    }
    const newCustomer = await Customer.create({ name, address, phone, email, balance });
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ message: 'Error creating customer', error: error.message });
  }
};

// Get a customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id, {
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
      },
    });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ message: 'Error fetching customer', error: error.message });
  }
};

// Update a customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, balance } = req.body;
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    await customer.update({
      name: name !== undefined ? name : customer.name,
      address: address !== undefined ? address : customer.address,
      phone: phone !== undefined ? phone : customer.phone,
      email: email !== undefined ? email : customer.email,
      balance: balance !== undefined ? balance : customer.balance,
    });
    res.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ message: 'Error updating customer', error: error.message });
  }
};

// Delete a customer
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    await customer.destroy();
    res.json({ message: 'Customer deleted successfully.' });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ message: 'Error deleting customer.', error: error.message });
  }
};

// Get invoices for a specific customer
exports.getCustomerInvoices = async (req, res) => {
  const customerId = req.params.id;
  try {
    // Verify if the customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fetch invoices for the customer, including related InvoiceItems and associated Item details
    const invoices = await Invoice.findAll({
      where: { customer_id: customerId },
      include: [
        { 
          model: InvoiceItem,
          include: [{ 
            model: Item,
            attributes: ['name', 'category_id', 'dimension', 'selling_price', 'unit']
          }]
        },
        { // Include Customer details if needed
          model: Customer,
          attributes: ['id', 'name', 'address', 'phone', 'email', 'balance']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Add a 'status' field based on due amount calculation
    const invoicesWithStatus = invoices.map(invoice => {
      let status = 'Paid';
      // Calculate total paid using associated InvoiceItems
      const totalPaid = invoice.InvoiceItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);
      // Determine due amount from invoice total minus paid amount
      const dueAmount = invoice.total - totalPaid;
      if (dueAmount > 0) {
        status = 'Unpaid';
      }
      return {
        ...invoice.toJSON(),
        status,
        dueAmount: dueAmount > 0 ? dueAmount : 0
      };
    });

    res.json(invoicesWithStatus);
  } catch (error) {
    console.error("Error fetching customer invoices:", error);
    res.status(500).json({ message: 'Error fetching customer invoices', error: error.message });
  }
};

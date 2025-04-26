const { Department } = require('../models');

exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json(department);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error creating department' });
  }
};

exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.json(departments);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error fetching departments' });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if(!department) return res.status(404).json({ error: 'Department not found' });
    res.json(department);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error fetching department' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if(!department) return res.status(404).json({ error: 'Department not found' });
    await department.update(req.body);
    res.json(department);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error updating department' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if(!department) return res.status(404).json({ error: 'Department not found' });
    await department.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error deleting department' });
  }
};

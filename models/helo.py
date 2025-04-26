import sys
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTabWidget, QWidget, QVBoxLayout, QHBoxLayout,
    QTableView, QPushButton, QDialog, QFormLayout, QLineEdit, QTextEdit, QComboBox,
    QDoubleSpinBox, QSpinBox, QDialogButtonBox, QMessageBox, QMenuBar, QAction,
    QStatusBar, QToolBar, QLabel, QDateEdit, QSplashScreen
)
from PyQt5.QtSql import QSqlDatabase, QSqlQuery, QSqlTableModel, QSqlQueryModel
from PyQt5.QtCore import Qt, QDate, QTimer
from PyQt5.QtGui import QIcon, QFont, QPixmap
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# --- Database Setup ---
def setup_database():
    db = QSqlDatabase.addDatabase("QSQLITE")
    db.setDatabaseName("stock_management.db")
    if not db.open():
        QMessageBox.critical(None, "Error", "Could not open database")
        return False
    
    query = QSqlQuery()
    # Create tables
    query.exec_("""CREATE TABLE IF NOT EXISTS Categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL)""")
    query.exec_("""CREATE TABLE IF NOT EXISTS StockItems (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    category_id INTEGER,
                    unit_price REAL,
                    FOREIGN KEY (category_id) REFERENCES Categories(id))""")
    query.exec_("""CREATE TABLE IF NOT EXISTS StockLevels (
                    item_id INTEGER PRIMARY KEY,
                    quantity INTEGER NOT NULL,
                    FOREIGN KEY (item_id) REFERENCES StockItems(id))""")
    query.exec_("""CREATE TABLE IF NOT EXISTS Suppliers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    contact_person TEXT,
                    phone TEXT,
                    email TEXT,
                    address TEXT)""")
    query.exec_("""CREATE TABLE IF NOT EXISTS Customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    contact_person TEXT,
                    phone TEXT,
                    email TEXT,
                    address TEXT)""")
    query.exec_("""CREATE TABLE IF NOT EXISTS PurchaseOrders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    supplier_id INTEGER,
                    order_date TEXT,
                    status TEXT,
                    FOREIGN KEY (supplier_id) REFERENCES Suppliers(id))""")
    query.exec_("""CREATE TABLE IF NOT EXISTS PurchaseOrderItems (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER,
                    item_id INTEGER,
                    quantity INTEGER,
                    price REAL,
                    FOREIGN KEY (order_id) REFERENCES PurchaseOrders(id),
                    FOREIGN KEY (item_id) REFERENCES StockItems(id))""")
    query.exec_("""CREATE TABLE IF NOT EXISTS SalesOrders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER,
                    order_date TEXT,
                    status TEXT,
                    FOREIGN KEY (customer_id) REFERENCES Customers(id))""")
    query.exec_("""CREATE TABLE IF NOT EXISTS SalesOrderItems (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER,
                    item_id INTEGER,
                    quantity INTEGER,
                    price REAL,
                    FOREIGN KEY (order_id) REFERENCES SalesOrders(id),
                    FOREIGN KEY (item_id) REFERENCES StockItems(id))""")
    
    # Insert sample data if tables are empty
    if not query.exec_("SELECT 1 FROM Categories LIMIT 1"):
        query.exec_("INSERT INTO Categories (name) VALUES ('Electronics')")
        query.exec_("INSERT INTO Categories (name) VALUES ('Clothing')")
    if not query.exec_("SELECT 1 FROM Suppliers LIMIT 1"):
        query.exec_("INSERT INTO Suppliers (name, contact_person, phone) VALUES ('TechCorp', 'Ali', '123-456-7890')")
    if not query.exec_("SELECT 1 FROM Customers LIMIT 1"):
        query.exec_("INSERT INTO Customers (name, contact_person, phone) VALUES ('RetailCustomer', 'John Doe', '987-654-3210')")
    
    return True

# --- Dialogs ---
class AddStockItemDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add Stock Item")
        self.setMinimumWidth(400)
        layout = QFormLayout()
        self.name_edit = QLineEdit()
        layout.addRow(QLabel("Name:"), self.name_edit)
        self.description_edit = QTextEdit()
        layout.addRow(QLabel("Description:"), self.description_edit)
        self.category_combo = QComboBox()
        query = QSqlQuery("SELECT id, name FROM Categories")
        while query.next():
            self.category_combo.addItem(query.value(1), query.value(0))
        layout.addRow(QLabel("Category:"), self.category_combo)
        self.unit_price_edit = QDoubleSpinBox()
        self.unit_price_edit.setRange(0, 1000000)
        self.unit_price_edit.setDecimals(2)
        layout.addRow(QLabel("Unit Price:"), self.unit_price_edit)
        self.quantity_edit = QSpinBox()
        self.quantity_edit.setRange(0, 1000000)
        layout.addRow(QLabel("Initial Quantity:"), self.quantity_edit)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    def accept(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Validation Error", "Name is required")
            return
        db = QSqlDatabase.database()
        if db.transaction():
            query = QSqlQuery()
            query.prepare("INSERT INTO StockItems (name, description, category_id, unit_price) VALUES (?, ?, ?, ?)")
            query.addBindValue(self.name_edit.text())
            query.addBindValue(self.description_edit.toPlainText())
            query.addBindValue(self.category_combo.currentData())
            query.addBindValue(self.unit_price_edit.value())
            if query.exec_():
                item_id = query.lastInsertId()
                query.prepare("INSERT INTO StockLevels (item_id, quantity) VALUES (?, ?)")
                query.addBindValue(item_id)
                query.addBindValue(self.quantity_edit.value())
                if query.exec_() and db.commit():
                    super().accept()
                else:
                    db.rollback()
                    QMessageBox.critical(self, "Error", "Failed to set stock level")
            else:
                db.rollback()
                QMessageBox.critical(self, "Error", "Failed to add item")

class EditStockItemDialog(QDialog):
    def __init__(self, item_id, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Edit Stock Item")
        self.setMinimumWidth(400)
        self.item_id = item_id
        layout = QFormLayout()
        self.name_edit = QLineEdit()
        self.description_edit = QTextEdit()
        self.category_combo = QComboBox()
        self.unit_price_edit = QDoubleSpinBox()
        self.unit_price_edit.setRange(0, 1000000)
        self.unit_price_edit.setDecimals(2)
        self.quantity_edit = QSpinBox()
        self.quantity_edit.setRange(0, 1000000)
        # Load existing data
        query = QSqlQuery()
        query.prepare("SELECT name, description, category_id, unit_price FROM StockItems WHERE id = ?")
        query.addBindValue(item_id)
        if query.exec_() and query.next():
            self.name_edit.setText(query.value(0))
            self.description_edit.setText(query.value(1))
            category_id = query.value(2)
            self.unit_price_edit.setValue(query.value(3))
        query.exec_("SELECT id, name FROM Categories")
        while query.next():
            self.category_combo.addItem(query.value(1), query.value(0))
            if query.value(0) == category_id:
                self.category_combo.setCurrentIndex(self.category_combo.count() - 1)
        query.prepare("SELECT quantity FROM StockLevels WHERE item_id = ?")
        query.addBindValue(item_id)
        if query.exec_() and query.next():
            self.quantity_edit.setValue(query.value(0))
        layout.addRow(QLabel("Name:"), self.name_edit)
        layout.addRow(QLabel("Description:"), self.description_edit)
        layout.addRow(QLabel("Category:"), self.category_combo)
        layout.addRow(QLabel("Unit Price:"), self.unit_price_edit)
        layout.addRow(QLabel("Quantity:"), self.quantity_edit)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    def accept(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Validation Error", "Name is required")
            return
        db = QSqlDatabase.database()
        if db.transaction():
            query = QSqlQuery()
            query.prepare("UPDATE StockItems SET name=?, description=?, category_id=?, unit_price=? WHERE id=?")
            query.addBindValue(self.name_edit.text())
            query.addBindValue(self.description_edit.toPlainText())
            query.addBindValue(self.category_combo.currentData())
            query.addBindValue(self.unit_price_edit.value())
            query.addBindValue(self.item_id)
            if query.exec_():
                query.prepare("UPDATE StockLevels SET quantity=? WHERE item_id=?")
                query.addBindValue(self.quantity_edit.value())
                query.addBindValue(self.item_id)
                if query.exec_() and db.commit():
                    super().accept()
                else:
                    db.rollback()
                    QMessageBox.critical(self, "Error", "Failed to update stock level")
            else:
                db.rollback()
                QMessageBox.critical(self, "Error", "Failed to update item")

class AddSupplierDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add Supplier")
        self.setMinimumWidth(400)
        layout = QFormLayout()
        self.name_edit = QLineEdit()
        layout.addRow(QLabel("Name:"), self.name_edit)
        self.contact_edit = QLineEdit()
        layout.addRow(QLabel("Contact Person:"), self.contact_edit)
        self.phone_edit = QLineEdit()
        layout.addRow(QLabel("Phone:"), self.phone_edit)
        self.email_edit = QLineEdit()
        layout.addRow(QLabel("Email:"), self.email_edit)
        self.address_edit = QTextEdit()
        layout.addRow(QLabel("Address:"), self.address_edit)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    def accept(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Validation Error", "Name is required")
            return
        query = QSqlQuery()
        query.prepare("INSERT INTO Suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)")
        query.addBindValue(self.name_edit.text())
        query.addBindValue(self.contact_edit.text())
        query.addBindValue(self.phone_edit.text())
        query.addBindValue(self.email_edit.text())
        query.addBindValue(self.address_edit.toPlainText())
        if query.exec_():
            super().accept()
        else:
            QMessageBox.critical(self, "Error", "Failed to add supplier")

class EditSupplierDialog(QDialog):
    def __init__(self, supplier_id, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Edit Supplier")
        self.setMinimumWidth(400)
        self.supplier_id = supplier_id
        layout = QFormLayout()
        self.name_edit = QLineEdit()
        self.contact_edit = QLineEdit()
        self.phone_edit = QLineEdit()
        self.email_edit = QLineEdit()
        self.address_edit = QTextEdit()
        # Load existing data
        query = QSqlQuery()
        query.prepare("SELECT name, contact_person, phone, email, address FROM Suppliers WHERE id = ?")
        query.addBindValue(supplier_id)
        if query.exec_() and query.next():
            self.name_edit.setText(query.value(0))
            self.contact_edit.setText(query.value(1))
            self.phone_edit.setText(query.value(2))
            self.email_edit.setText(query.value(3))
            self.address_edit.setText(query.value(4))
        layout.addRow(QLabel("Name:"), self.name_edit)
        layout.addRow(QLabel("Contact Person:"), self.contact_edit)
        layout.addRow(QLabel("Phone:"), self.phone_edit)
        layout.addRow(QLabel("Email:"), self.email_edit)
        layout.addRow(QLabel("Address:"), self.address_edit)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    def accept(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Validation Error", "Name is required")
            return
        query = QSqlQuery()
        query.prepare("UPDATE Suppliers SET name=?, contact_person=?, phone=?, email=?, address=? WHERE id=?")
        query.addBindValue(self.name_edit.text())
        query.addBindValue(self.contact_edit.text())
        query.addBindValue(self.phone_edit.text())
        query.addBindValue(self.email_edit.text())
        query.addBindValue(self.address_edit.toPlainText())
        query.addBindValue(self.supplier_id)
        if query.exec_():
            super().accept()
        else:
            QMessageBox.critical(self, "Error", "Failed to update supplier")

class AddCustomerDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add Customer")
        self.setMinimumWidth(400)
        layout = QFormLayout()
        self.name_edit = QLineEdit()
        layout.addRow(QLabel("Name:"), self.name_edit)
        self.contact_edit = QLineEdit()
        layout.addRow(QLabel("Contact Person:"), self.contact_edit)
        self.phone_edit = QLineEdit()
        layout.addRow(QLabel("Phone:"), self.phone_edit)
        self.email_edit = QLineEdit()
        layout.addRow(QLabel("Email:"), self.email_edit)
        self.address_edit = QTextEdit()
        layout.addRow(QLabel("Address:"), self.address_edit)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    def accept(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Validation Error", "Name is required")
            return
        query = QSqlQuery()
        query.prepare("INSERT INTO Customers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)")
        query.addBindValue(self.name_edit.text())
        query.addBindValue(self.contact_edit.text())
        query.addBindValue(self.phone_edit.text())
        query.addBindValue(self.email_edit.text())
        query.addBindValue(self.address_edit.toPlainText())
        if query.exec_():
            super().accept()
        else:
            QMessageBox.critical(self, "Error", "Failed to add customer")

class EditCustomerDialog(QDialog):
    def __init__(self, customer_id, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Edit Customer")
        self.setMinimumWidth(400)
        self.customer_id = customer_id
        layout = QFormLayout()
        self.name_edit = QLineEdit()
        self.contact_edit = QLineEdit()
        self.phone_edit = QLineEdit()
        self.email_edit = QLineEdit()
        self.address_edit = QTextEdit()
        # Load existing data
        query = QSqlQuery()
        query.prepare("SELECT name, contact_person, phone, email, address FROM Customers WHERE id = ?")
        query.addBindValue(customer_id)
        if query.exec_() and query.next():
            self.name_edit.setText(query.value(0))
            self.contact_edit.setText(query.value(1))
            self.phone_edit.setText(query.value(2))
            self.email_edit.setText(query.value(3))
            self.address_edit.setText(query.value(4))
        layout.addRow(QLabel("Name:"), self.name_edit)
        layout.addRow(QLabel("Contact Person:"), self.contact_edit)
        layout.addRow(QLabel("Phone:"), self.phone_edit)
        layout.addRow(QLabel("Email:"), self.email_edit)
        layout.addRow(QLabel("Address:"), self.address_edit)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    def accept(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Validation Error", "Name is required")
            return
        query = QSqlQuery()
        query.prepare("UPDATE Customers SET name=?, contact_person=?, phone=?, email=?, address=? WHERE id=?")
        query.addBindValue(self.name_edit.text())
        query.addBindValue(self.contact_edit.text())
        query.addBindValue(self.phone_edit.text())
        query.addBindValue(self.email_edit.text())
        query.addBindValue(self.address_edit.toPlainText())
        query.addBindValue(self.customer_id)
        if query.exec_():
            super().accept()
        else:
            QMessageBox.critical(self, "Error", "Failed to update customer")

class AddPurchaseOrderDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add Purchase Order")
        self.setMinimumWidth(400)
        layout = QFormLayout()
        self.supplier_combo = QComboBox()
        query = QSqlQuery("SELECT id, name FROM Suppliers")
        while query.next():
            self.supplier_combo.addItem(query.value(1), query.value(0))
        layout.addRow(QLabel("Supplier:"), self.supplier_combo)
        self.order_date_edit = QDateEdit()
        self.order_date_edit.setDate(QDate.currentDate())
        layout.addRow(QLabel("Order Date:"), self.order_date_edit)
        self.status_combo = QComboBox()
        self.status_combo.addItems(["Pending", "Received", "Cancelled"])
        layout.addRow(QLabel("Status:"), self.status_combo)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    def accept(self):
        query = QSqlQuery()
        query.prepare("INSERT INTO PurchaseOrders (supplier_id, order_date, status) VALUES (?, ?, ?)")
        query.addBindValue(self.supplier_combo.currentData())
        query.addBindValue(self.order_date_edit.date().toString(Qt.ISODate))
        query.addBindValue(self.status_combo.currentText())
        if query.exec_():
            super().accept()
        else:
            QMessageBox.critical(self, "Error", "Failed to add purchase order")

class AddSalesOrderDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add Sales Order")
        self.setMinimumWidth(400)
        layout = QFormLayout()
        self.customer_combo = QComboBox()
        query = QSqlQuery("SELECT id, name FROM Customers")
        while query.next():
            self.customer_combo.addItem(query.value(1), query.value(0))
        layout.addRow(QLabel("Customer:"), self.customer_combo)
        self.order_date_edit = QDateEdit()
        self.order_date_edit.setDate(QDate.currentDate())
        layout.addRow(QLabel("Order Date:"), self.order_date_edit)
        self.status_combo = QComboBox()
        self.status_combo.addItems(["Pending", "Shipped", "Completed"])
        layout.addRow(QLabel("Status:"), self.status_combo)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    def accept(self):
        if not self.customer_combo.currentData():
            QMessageBox.warning(self, "Error", "Please select a customer")
            return
        query = QSqlQuery()
        query.prepare("INSERT INTO SalesOrders (customer_id, order_date, status) VALUES (?, ?, ?)")
        query.addBindValue(self.customer_combo.currentData())
        query.addBindValue(self.order_date_edit.date().toString(Qt.ISODate))
        query.addBindValue(self.status_combo.currentText())
        if query.exec_():
            super().accept()
        else:
            QMessageBox.critical(self, "Error", "Failed to add sales order")

class ManageOrderItemsDialog(QDialog):
    def __init__(self, order_id, order_type, parent=None):
        super().__init__(parent)
        self.order_id = order_id
        self.order_type = order_type  # "Purchase" or "Sales"
        self.setWindowTitle(f"Manage Items for {order_type} Order {order_id}")
        layout = QVBoxLayout()
        self.table_view = QTableView()
        self.model = QSqlTableModel()
        if order_type == "Purchase":
            self.model.setTable("PurchaseOrderItems")
        else:
            self.model.setTable("SalesOrderItems")
        self.model.setFilter(f"order_id = {order_id}")
        self.model.select()
        self.table_view.setModel(self.model)
        layout.addWidget(self.table_view)
        buttons_layout = QHBoxLayout()
        add_button = QPushButton(QIcon("add.png"), "Add Item")
        add_button.clicked.connect(self.add_item)
        buttons_layout.addWidget(add_button)
        delete_button = QPushButton(QIcon("delete.png"), "Delete Item")
        delete_button.clicked.connect(self.delete_item)
        buttons_layout.addWidget(delete_button)
        layout.addLayout(buttons_layout)
        self.setLayout(layout)
    
    def add_item(self):
        dialog = AddOrderItemDialog(self.order_type, self)
        if dialog.exec_() == QDialog.Accepted:
            item_id = dialog.item_combo.currentData()
            quantity = dialog.quantity_edit.value()
            price = dialog.price_edit.value()
            query = QSqlQuery()
            if self.order_type == "Purchase":
                query.prepare("INSERT INTO PurchaseOrderItems (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)")
            else:
                query.prepare("INSERT INTO SalesOrderItems (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)")
            query.addBindValue(self.order_id)
            query.addBindValue(item_id)
            query.addBindValue(quantity)
            query.addBindValue(price)
            if query.exec_():
                self.model.select()
            else:
                QMessageBox.critical(self, "Error", "Failed to add item")
    
    def delete_item(self):
        selected = self.table_view.selectedIndexes()
        if selected:
            row = selected[0].row()
            self.model.removeRow(row)
            self.model.submitAll()

class AddOrderItemDialog(QDialog):
    def __init__(self, order_type, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add Order Item")
        layout = QFormLayout()
        self.item_combo = QComboBox()
        query = QSqlQuery("SELECT id, name FROM StockItems")
        while query.next():
            self.item_combo.addItem(query.value(1), query.value(0))
        layout.addRow(QLabel("Item:"), self.item_combo)
        self.quantity_edit = QSpinBox()
        self.quantity_edit.setRange(1, 1000)
        layout.addRow(QLabel("Quantity:"), self.quantity_edit)
        self.price_edit = QDoubleSpinBox()
        self.price_edit.setRange(0, 1000000)
        self.price_edit.setDecimals(2)
        layout.addRow(QLabel("Price:"), self.price_edit)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)

class SelectSalesOrderDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Select Sales Order")
        layout = QFormLayout()
        self.order_combo = QComboBox()
        query = QSqlQuery("SELECT id, customer_id FROM SalesOrders")
        while query.next():
            order_id = query.value(0)
            customer_id = query.value(1)
            customer_query = QSqlQuery(f"SELECT name FROM Customers WHERE id = {customer_id}")
            customer_name = customer_query.next() and customer_query.value(0) or "Unknown"
            self.order_combo.addItem(f"Order {order_id} - {customer_name}", order_id)
        layout.addRow("Select Order:", self.order_combo)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        self.setLayout(layout)
    
    @property
    def selected_order_id(self):
        return self.order_combo.currentData()

# --- Tab Widgets ---
class StockItemsTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout()
        self.table_view = QTableView()
        self.model = QSqlTableModel()
        self.model.setTable("StockItems")
        self.model.setEditStrategy(QSqlTableModel.OnManualSubmit)
        self.model.select()
        self.table_view.setModel(self.model)
        self.table_view.resizeColumnsToContents()
        layout.addWidget(self.table_view)
        buttons_layout = QHBoxLayout()
        add_button = QPushButton(QIcon("add.png"), "Add Item")
        add_button.setToolTip("Add a new stock item")
        add_button.clicked.connect(self.add_item)
        buttons_layout.addWidget(add_button)
        edit_button = QPushButton(QIcon("edit.png"), "Edit Item")
        edit_button.setToolTip("Edit selected stock item")
        edit_button.clicked.connect(self.edit_item)
        buttons_layout.addWidget(edit_button)
        delete_button = QPushButton(QIcon("delete.png"), "Delete Item")
        delete_button.setToolTip("Delete selected stock item")
        delete_button.clicked.connect(self.delete_item)
        buttons_layout.addWidget(delete_button)
        layout.addLayout(buttons_layout)
        self.setLayout(layout)
    
    def add_item(self):
        dialog = AddStockItemDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            self.model.select()
    
    def edit_item(self):
        selected = self.table_view.selectedIndexes()
        if not selected:
            QMessageBox.warning(self, "Warning", "Please select an item to edit")
            return
        row = selected[0].row()
        item_id = self.model.index(row, 0).data()
        dialog = EditStockItemDialog(item_id, self)
        if dialog.exec_() == QDialog.Accepted:
            self.model.select()
    
    def delete_item(self):
        selected = self.table_view.selectedIndexes()
        if not selected:
            QMessageBox.warning(self, "Warning", "Please select an item to delete")
            return
        row = selected[0].row()
        reply = QMessageBox.question(self, "Confirm", "Delete this item?", QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            self.model.removeRow(row)
            if self.model.submitAll():
                self.model.select()
            else:
                QMessageBox.critical(self, "Error", "Failed to delete item")

class SuppliersTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout()
        self.table_view = QTableView()
        self.model = QSqlTableModel()
        self.model.setTable("Suppliers")
        self.model.setEditStrategy(QSqlTableModel.OnManualSubmit)
        self.model.select()
        self.table_view.setModel(self.model)
        self.table_view.resizeColumnsToContents()
        layout.addWidget(self.table_view)
        buttons_layout = QHBoxLayout()
        add_button = QPushButton(QIcon("add.png"), "Add Supplier")
        add_button.setToolTip("Add a new supplier")
        add_button.clicked.connect(self.add_supplier)
        buttons_layout.addWidget(add_button)
        edit_button = QPushButton(QIcon("edit.png"), "Edit Supplier")
        edit_button.setToolTip("Edit selected supplier")
        edit_button.clicked.connect(self.edit_supplier)
        buttons_layout.addWidget(edit_button)
        delete_button = QPushButton(QIcon("delete.png"), "Delete Supplier")
        delete_button.setToolTip("Delete selected supplier")
        delete_button.clicked.connect(self.delete_supplier)
        buttons_layout.addWidget(delete_button)
        layout.addLayout(buttons_layout)
        self.setLayout(layout)
    
    def add_supplier(self):
        dialog = AddSupplierDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            self.model.select()
    
    def edit_supplier(self):
        selected = self.table_view.selectedIndexes()
        if not selected:
            QMessageBox.warning(self, "Warning", "Please select a supplier to edit")
            return
        row = selected[0].row()
        supplier_id = self.model.index(row, 0).data()
        dialog = EditSupplierDialog(supplier_id, self)
        if dialog.exec_() == QDialog.Accepted:
            self.model.select()
    
    def delete_supplier(self):
        selected = self.table_view.selectedIndexes()
        if not selected:
            QMessageBox.warning(self, "Warning", "Please select a supplier to delete")
            return
        row = selected[0].row()
        reply = QMessageBox.question(self, "Confirm", "Delete this supplier?", QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            self.model.removeRow(row)
            if self.model.submitAll():
                self.model.select()
            else:
                QMessageBox.critical(self, "Error", "Failed to delete supplier")

class CustomersTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout()
        self.table_view = QTableView()
        self.model = QSqlTableModel()
        self.model.setTable("Customers")
        self.model.setEditStrategy(QSqlTableModel.OnManualSubmit)
        self.model.select()
        self.table_view.setModel(self.model)
        self.table_view.resizeColumnsToContents()
        layout.addWidget(self.table_view)
        buttons_layout = QHBoxLayout()
        add_button = QPushButton(QIcon("add.png"), "Add Customer")
        add_button.setToolTip("Add a new customer")
        add_button.clicked.connect(self.add_customer)
        buttons_layout.addWidget(add_button)
        edit_button = QPushButton(QIcon("edit.png"), "Edit Customer")
        edit_button.setToolTip("Edit selected customer")
        edit_button.clicked.connect(self.edit_customer)
        buttons_layout.addWidget(edit_button)
        delete_button = QPushButton(QIcon("delete.png"), "Delete Customer")
        delete_button.setToolTip("Delete selected customer")
        delete_button.clicked.connect(self.delete_customer)
        buttons_layout.addWidget(delete_button)
        layout.addLayout(buttons_layout)
        self.setLayout(layout)
    
    def add_customer(self):
        dialog = AddCustomerDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            self.model.select()
    
    def edit_customer(self):
        selected = self.table_view.selectedIndexes()
        if not selected:
            QMessageBox.warning(self, "Warning", "Please select a customer to edit")
            return
        row = selected[0].row()
        customer_id = self.model.index(row, 0).data()
        dialog = EditCustomerDialog(customer_id, self)
        if dialog.exec_() == QDialog.Accepted:
            self.model.select()
    
    def delete_customer(self):
        selected = self.table_view.selectedIndexes()
        if not selected:
            QMessageBox.warning(self, "Warning", "Please select a customer to delete")
            return
        row = selected[0].row()
        reply = QMessageBox.question(self, "Confirm", "Delete this customer?", QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            self.model.removeRow(row)
            if self.model.submitAll():
                self.model.select()
            else:
                QMessageBox.critical(self, "Error", "Failed to delete customer")

class PurchaseOrdersTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout()
        self.table_view = QTableView()
        self.model = QSqlTableModel()
        self.model.setTable("PurchaseOrders")
        self.model.setEditStrategy(QSqlTableModel.OnManualSubmit)
        self.model.select()
        self.table_view.setModel(self.model)
        self.table_view.resizeColumnsToContents()
        layout.addWidget(self.table_view)
        buttons_layout = QHBoxLayout()
        add_button = QPushButton(QIcon("add.png"), "Add Order")
        add_button.setToolTip("Add a new purchase order")
        add_button.clicked.connect(self.add_order)
        buttons_layout.addWidget(add_button)
        manage_items_button = QPushButton(QIcon("items.png"), "Manage Items")
        manage_items_button.setToolTip("Manage items for selected order")
        manage_items_button.clicked.connect(self.manage_items)
        buttons_layout.addWidget(manage_items_button)
        layout.addLayout(buttons_layout)
        self.setLayout(layout)
    
    def add_order(self):
        dialog = AddPurchaseOrderDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            self.model.select()
    
    def manage_items(self):
        selected = self.table_view.selectedIndexes()
        if not selected:
            QMessageBox.warning(self, "Warning", "Please select an order")
            return
        row = selected[0].row()
        order_id = self.model.index(row, 0).data()
        dialog = ManageOrderItemsDialog(order_id, "Purchase", self)
        dialog.exec_()

class SalesOrdersTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout()
        self.table_view = QTableView()
        self.model = QSqlTableModel()
        self.model.setTable("SalesOrders")
        self.model.setEditStrategy(QSqlTableModel.OnManualSubmit)
        self.model.select()
        self.table_view.setModel(self.model)
        self.table_view.resizeColumnsToContents()
        layout.addWidget(self.table_view)
        buttons_layout = QHBoxLayout()
        add_button = QPushButton(QIcon("add.png"), "Add Order")
        add_button.setToolTip("Add a new sales order")
        add_button.clicked.connect(self.add_order)
        buttons_layout.addWidget(add_button)
        manage_items_button = QPushButton(QIcon("items.png"), "Manage Items")
        manage_items_button.setToolTip("Manage items for selected order")
        manage_items_button.clicked.connect(self.manage_items)
        buttons_layout.addWidget(manage_items_button)
        layout.addLayout(buttons_layout)
        self.setLayout(layout)
    
    def add_order(self):
        dialog = AddSalesOrderDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            self.model.select()
    
    def manage_items(self):
        selected = self.table_view.selectedIndexes()
        if not selected:
            QMessageBox.warning(self, "Warning", "Please select an order")
            return
        row = selected[0].row()
        order_id = self.model.index(row, 0).data()
        dialog = ManageOrderItemsDialog(order_id, "Sales", self)
        dialog.exec_()

class LowStockReportTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout()
        self.table_view = QTableView()
        self.model = QSqlQueryModel()
        self.refresh_report()
        self.table_view.setModel(self.model)
        layout.addWidget(self.table_view)
        refresh_button = QPushButton("Refresh Report")
        refresh_button.clicked.connect(self.refresh_report)
        layout.addWidget(refresh_button)
        self.setLayout(layout)
    
    def refresh_report(self):
        query = QSqlQuery("SELECT si.name, sl.quantity FROM StockItems si JOIN StockLevels sl ON si.id = sl.item_id WHERE sl.quantity < 10")
        self.model.setQuery(query)
        self.table_view.resizeColumnsToContents()

# --- PDF Generation ---
def generate_invoice_pdf(order_id, filename):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    # Company Header (hardcoded for now)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Your Company Name")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, "123 Business St, City, Country")
    # Invoice Title and Details
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 120, f"Invoice #{order_id}")
    query = QSqlQuery(f"SELECT customer_id, order_date FROM SalesOrders WHERE id = {order_id}")
    if query.next():
        customer_id = query.value(0)
        order_date = query.value(1)
        customer_query = QSqlQuery(f"SELECT name, address FROM Customers WHERE id = {customer_id}")
        if customer_query.next():
            customer_name = customer_query.value(0)
            customer_address = customer_query.value(1)
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 150, f"Date: {order_date}")
    c.drawString(50, height - 170, "Bill To:")
    c.drawString(50, height - 190, customer_name)
    c.drawString(50, height - 210, customer_address or "")
    # Items Table
    c.setFont("Helvetica-Bold", 12)
    y = height - 250
    c.drawString(50, y, "Item")
    c.drawString(200, y, "Quantity")
    c.drawString(300, y, "Price")
    c.drawString(400, y, "Total")
    c.line(50, y - 5, 500, y - 5)
    y -= 20
    c.setFont("Helvetica", 12)
    total_amount = 0
    query = QSqlQuery(f"SELECT item_id, quantity, price FROM SalesOrderItems WHERE order_id = {order_id}")
    while query.next():
        item_id = query.value(0)
        qty = query.value(1)
        price = query.value(2)
        item_query = QSqlQuery(f"SELECT name FROM StockItems WHERE id = {item_id}")
        item_name = item_query.next() and item_query.value(0) or "Unknown Item"
        line_total = qty * price
        total_amount += line_total
        c.drawString(50, y, item_name[:20])
        c.drawString(200, y, str(qty))
        c.drawString(300, y, f"${price:.2f}")
        c.drawString(400, y, f"${line_total:.2f}")
        y -= 20
    # Total
    c.line(50, y - 5, 500, y - 5)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(300, y - 25, "Total:")
    c.drawString(400, y - 25, f"${total_amount:.2f}")
    c.showPage()
    c.save()

# --- Main Window ---
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Stock Management System")
        self.setGeometry(100, 100, 1000, 700)
        # Splash Screen (requires a logo.png file or remove this part)
        splash = QSplashScreen(QPixmap("logo.png"))
        splash.show()
        QTimer.singleShot(2000, splash.close)
        # Menu Bar
        menubar = self.menuBar()
        file_menu = menubar.addMenu("File")
        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        inventory_menu = menubar.addMenu("Inventory")
        stock_items_action = QAction("Stock Items", self)
        inventory_menu.addAction(stock_items_action)
        suppliers_action = QAction("Suppliers", self)
        inventory_menu.addAction(suppliers_action)
        customers_action = QAction("Customers", self)
        inventory_menu.addAction(customers_action)
        orders_menu = menubar.addMenu("Orders")
        purchase_orders_action = QAction("Purchase Orders", self)
        orders_menu.addAction(purchase_orders_action)
        sales_orders_action = QAction("Sales Orders", self)
        orders_menu.addAction(sales_orders_action)
        reports_menu = menubar.addMenu("Reports")
        low_stock_action = QAction("Low Stock Report", self)
        reports_menu.addAction(low_stock_action)
        generate_invoice_action = QAction("Generate Invoice", self)
        reports_menu.addAction(generate_invoice_action)
        # Toolbar
        toolbar = QToolBar()
        self.addToolBar(toolbar)
        toolbar.addAction(exit_action)
        # Status Bar
        self.statusBar().showMessage("Welcome to Stock Management System")
        # Central Widget
        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)
        # Add Tabs
        self.stock_items_tab = StockItemsTab()
        self.tabs.addTab(self.stock_items_tab, "Stock Items")
        self.suppliers_tab = SuppliersTab()
        self.tabs.addTab(self.suppliers_tab, "Suppliers")
        self.customers_tab = CustomersTab()
        self.tabs.addTab(self.customers_tab, "Customers")
        self.purchase_orders_tab = PurchaseOrdersTab()
        self.tabs.addTab(self.purchase_orders_tab, "Purchase Orders")
        self.sales_orders_tab = SalesOrdersTab()
        self.tabs.addTab(self.sales_orders_tab, "Sales Orders")
        self.low_stock_tab = LowStockReportTab()
        self.tabs.addTab(self.low_stock_tab, "Low Stock Report")
        # Connect menu actions to tab switching
        stock_items_action.triggered.connect(lambda: self.tabs.setCurrentWidget(self.stock_items_tab))
        suppliers_action.triggered.connect(lambda: self.tabs.setCurrentWidget(self.suppliers_tab))
        customers_action.triggered.connect(lambda: self.tabs.setCurrentWidget(self.customers_tab))
        purchase_orders_action.triggered.connect(lambda: self.tabs.setCurrentWidget(self.purchase_orders_tab))
        sales_orders_action.triggered.connect(lambda: self.tabs.setCurrentWidget(self.sales_orders_tab))
        low_stock_action.triggered.connect(lambda: self.tabs.setCurrentWidget(self.low_stock_tab))
        generate_invoice_action.triggered.connect(self.generate_sales_invoice)
        # Apply Stylesheet for Enhanced UI
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f0f0f0;
            }
            QTabWidget::pane {
                border: 1px solid #dcdcdc;
                background-color: #ffffff;
            }
            QTabBar::tab {
                background: #e0e0e0;
                padding: 12px;
                font-size: 14px;
            }
            QTabBar::tab:selected {
                background: #ffffff;
                border-bottom: 2px solid #4CAF50;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
            QTableView {
                background-color: #ffffff;
                alternate-background-color: #f5f5f5;
                border: 1px solid #dcdcdc;
                font-size: 13px;
            }
            QLineEdit, QComboBox, QDateEdit {
                padding: 6px;
                border: 1px solid #dcdcdc;
                border-radius: 4px;
                font-size: 13px;
            }
            QLabel {
                font-size: 14px;
                color: #333333;
            }
            QMenuBar {
                background-color: #ffffff;
                font-size: 14px;
            }
            QMenuBar::item:selected {
                background-color: #e0e0e0;
            }
        """)
    
    def generate_sales_invoice(self):
        dialog = SelectSalesOrderDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            order_id = dialog.selected_order_id
            filename = f"invoice_{order_id}.pdf"
            generate_invoice_pdf(order_id, filename)
            QMessageBox.information(self, "Success", f"Invoice generated: {filename}")

# --- Application Entry Point ---
if __name__ == "__main__":
    app = QApplication(sys.argv)
    if not setup_database():
        sys.exit(1)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
"""Preset category seed data"""

from app.models.category import CategoryType

# Two-level hierarchical preset categories
PRESET_CATEGORIES = [
    # Income Categories
    {
        "name": "Income",
        "category_type": CategoryType.INCOME,
        "is_system": True,
        "color": "#52c41a",
        "icon": "dollar",
        "subcategories": [
            {"name": "Salary", "color": "#73d13d", "icon": "wallet"},
            {"name": "Freelance", "color": "#95de64", "icon": "laptop"},
            {"name": "Business", "color": "#b7eb8f", "icon": "shop"},
            {"name": "Investments", "color": "#d9f7be", "icon": "stock"},
            {"name": "Gifts Received", "color": "#f6ffed", "icon": "gift"},
            {"name": "Refunds", "color": "#237804", "icon": "undo"},
            {"name": "Other Income", "color": "#389e0d", "icon": "plus-circle"},
        ]
    },
    
    # Expense Categories - Housing
    {
        "name": "Housing",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#1890ff",
        "icon": "home",
        "subcategories": [
            {"name": "Rent/Mortgage", "color": "#40a9ff", "icon": "bank"},
            {"name": "Property Tax", "color": "#69c0ff", "icon": "file-text"},
            {"name": "Home Insurance", "color": "#91d5ff", "icon": "safety"},
            {"name": "Utilities", "color": "#bae7ff", "icon": "thunderbolt"},
            {"name": "Maintenance", "color": "#e6f7ff", "icon": "tool"},
            {"name": "HOA Fees", "color": "#096dd9", "icon": "team"},
        ]
    },
    
    # Expense Categories - Transportation
    {
        "name": "Transportation",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#722ed1",
        "icon": "car",
        "subcategories": [
            {"name": "Gas/Fuel", "color": "#9254de", "icon": "dashboard"},
            {"name": "Car Payment", "color": "#b37feb", "icon": "credit-card"},
            {"name": "Car Insurance", "color": "#d3adf7", "icon": "safety"},
            {"name": "Maintenance/Repairs", "color": "#efdbff", "icon": "wrench"},
            {"name": "Public Transit", "color": "#f9f0ff", "icon": "environment"},
            {"name": "Parking", "color": "#531dab", "icon": "compass"},
            {"name": "Rideshare/Taxi", "color": "#9254de", "icon": "rocket"},
        ]
    },
    
    # Expense Categories - Food
    {
        "name": "Food",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#fa8c16",
        "icon": "shopping",
        "subcategories": [
            {"name": "Groceries", "color": "#ffa940", "icon": "shopping-cart"},
            {"name": "Dining Out", "color": "#ffc069", "icon": "coffee"},
            {"name": "Takeout/Delivery", "color": "#ffd591", "icon": "inbox"},
            {"name": "Fast Food", "color": "#ffe7ba", "icon": "fire"},
            {"name": "Coffee Shops", "color": "#fff7e6", "icon": "coffee"},
        ]
    },
    
    # Expense Categories - Healthcare
    {
        "name": "Healthcare",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#eb2f96",
        "icon": "heart",
        "subcategories": [
            {"name": "Health Insurance", "color": "#f759ab", "icon": "safety"},
            {"name": "Doctor Visits", "color": "#ff85c0", "icon": "medicine-box"},
            {"name": "Prescriptions", "color": "#ffadd2", "icon": "experiment"},
            {"name": "Dental", "color": "#ffd6e7", "icon": "smile"},
            {"name": "Vision", "color": "#fff0f6", "icon": "eye"},
            {"name": "Medical Supplies", "color": "#c41d7f", "icon": "first-aid"},
        ]
    },
    
    # Expense Categories - Entertainment
    {
        "name": "Entertainment",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#13c2c2",
        "icon": "play-circle",
        "subcategories": [
            {"name": "Streaming Services", "color": "#36cfc9", "icon": "video-camera"},
            {"name": "Movies/Theater", "color": "#5cdbd3", "icon": "film"},
            {"name": "Concerts/Events", "color": "#87e8de", "icon": "sound"},
            {"name": "Hobbies", "color": "#b5f5ec", "icon": "build"},
            {"name": "Games", "color": "#e6fffb", "icon": "trophy"},
            {"name": "Books/Music", "color": "#08979c", "icon": "book"},
        ]
    },
    
    # Expense Categories - Shopping
    {
        "name": "Shopping",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#f5222d",
        "icon": "shopping-bag",
        "subcategories": [
            {"name": "Clothing", "color": "#ff4d4f", "icon": "skin"},
            {"name": "Electronics", "color": "#ff7875", "icon": "laptop"},
            {"name": "Home Goods", "color": "#ffa39e", "icon": "home"},
            {"name": "Personal Care", "color": "#ffccc7", "icon": "star"},
            {"name": "Gifts", "color": "#fff1f0", "icon": "gift"},
            {"name": "Other Shopping", "color": "#cf1322", "icon": "tags"},
        ]
    },
    
    # Expense Categories - Personal
    {
        "name": "Personal",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#faad14",
        "icon": "user",
        "subcategories": [
            {"name": "Gym/Fitness", "color": "#ffc53d", "icon": "heart"},
            {"name": "Hair/Beauty", "color": "#ffd666", "icon": "scissors"},
            {"name": "Education", "color": "#ffe58f", "icon": "read"},
            {"name": "Childcare", "color": "#fff1b8", "icon": "team"},
            {"name": "Pet Care", "color": "#fffbe6", "icon": "smile"},
            {"name": "Phone", "color": "#ad6800", "icon": "phone"},
            {"name": "Internet", "color": "#d48806", "icon": "wifi"},
        ]
    },
    
    # Expense Categories - Financial
    {
        "name": "Financial",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#2f54eb",
        "icon": "bank",
        "subcategories": [
            {"name": "Bank Fees", "color": "#597ef7", "icon": "alert"},
            {"name": "Loan Payment", "color": "#85a5ff", "icon": "credit-card"},
            {"name": "Credit Card Payment", "color": "#adc6ff", "icon": "wallet"},
            {"name": "Investments", "color": "#d6e4ff", "icon": "stock"},
            {"name": "Savings", "color": "#f0f5ff", "icon": "piggy-bank"},
            {"name": "Taxes", "color": "#1d39c4", "icon": "file-text"},
        ]
    },
    
    # Expense Categories - Travel
    {
        "name": "Travel",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#52c41a",
        "icon": "global",
        "subcategories": [
            {"name": "Flights", "color": "#73d13d", "icon": "rocket"},
            {"name": "Hotels", "color": "#95de64", "icon": "home"},
            {"name": "Rental Car", "color": "#b7eb8f", "icon": "car"},
            {"name": "Vacation", "color": "#d9f7be", "icon": "smile"},
        ]
    },
    
    # Expense Categories - Miscellaneous
    {
        "name": "Miscellaneous",
        "category_type": CategoryType.EXPENSE,
        "is_system": True,
        "color": "#8c8c8c",
        "icon": "question-circle",
        "subcategories": [
            {"name": "Charity/Donations", "color": "#bfbfbf", "icon": "heart"},
            {"name": "Legal Fees", "color": "#d9d9d9", "icon": "file-protect"},
            {"name": "Other Expenses", "color": "#f5f5f5", "icon": "ellipsis"},
        ]
    },
]


def get_preset_categories():
    """Return preset categories for seeding"""
    return PRESET_CATEGORIES

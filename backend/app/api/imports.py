"""Bank transaction import API endpoints"""

import csv
import io
import re
from datetime import datetime, date
from typing import List, Optional, Dict, Tuple
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.transaction import Transaction, TransactionType
from app.models.account import Account
from app.models.category import Category, CategoryType
from app.models.category_keyword import CategoryKeyword

router = APIRouter()


# Keyword patterns for auto-categorization
# Maps keywords (lowercase) to (parent_category_name, subcategory_name)
CATEGORY_KEYWORDS: Dict[str, Tuple[str, str]] = {
    # Income patterns
    "payroll": ("Income", "Salary"),
    "direct dep": ("Income", "Salary"),
    "salary": ("Income", "Salary"),
    "wage": ("Income", "Salary"),
    "paycheck": ("Income", "Salary"),
    "employer": ("Income", "Salary"),
    "refund": ("Income", "Refunds"),
    "rebate": ("Income", "Refunds"),
    "cashback": ("Income", "Refunds"),
    "dividend": ("Income", "Investments"),
    "interest": ("Income", "Investments"),
    "venmo": ("Income", "Other Income"),
    "zelle": ("Income", "Other Income"),
    "transfer from": ("Income", "Other Income"),
    
    # Food & Dining
    "grocery": ("Food", "Groceries"),
    "groceries": ("Food", "Groceries"),
    "supermarket": ("Food", "Groceries"),
    "walmart": ("Food", "Groceries"),
    "target": ("Food", "Groceries"),
    "costco": ("Food", "Groceries"),
    "kroger": ("Food", "Groceries"),
    "safeway": ("Food", "Groceries"),
    "whole foods": ("Food", "Groceries"),
    "trader joe": ("Food", "Groceries"),
    "aldi": ("Food", "Groceries"),
    "publix": ("Food", "Groceries"),
    "wegmans": ("Food", "Groceries"),
    "heb": ("Food", "Groceries"),
    "food lion": ("Food", "Groceries"),
    "giant": ("Food", "Groceries"),
    "stop & shop": ("Food", "Groceries"),
    "sprouts": ("Food", "Groceries"),
    
    "restaurant": ("Food", "Dining Out"),
    "cafe": ("Food", "Dining Out"),
    "bistro": ("Food", "Dining Out"),
    "grill": ("Food", "Dining Out"),
    "steakhouse": ("Food", "Dining Out"),
    "sushi": ("Food", "Dining Out"),
    "pizza": ("Food", "Dining Out"),
    "chipotle": ("Food", "Dining Out"),
    "olive garden": ("Food", "Dining Out"),
    "applebee": ("Food", "Dining Out"),
    "chili's": ("Food", "Dining Out"),
    "outback": ("Food", "Dining Out"),
    "panera": ("Food", "Dining Out"),
    
    "doordash": ("Food", "Takeout/Delivery"),
    "uber eats": ("Food", "Takeout/Delivery"),
    "ubereats": ("Food", "Takeout/Delivery"),
    "grubhub": ("Food", "Takeout/Delivery"),
    "postmates": ("Food", "Takeout/Delivery"),
    "seamless": ("Food", "Takeout/Delivery"),
    "instacart": ("Food", "Takeout/Delivery"),
    
    "mcdonald": ("Food", "Fast Food"),
    "burger king": ("Food", "Fast Food"),
    "wendy": ("Food", "Fast Food"),
    "taco bell": ("Food", "Fast Food"),
    "subway": ("Food", "Fast Food"),
    "chick-fil-a": ("Food", "Fast Food"),
    "popeye": ("Food", "Fast Food"),
    "kfc": ("Food", "Fast Food"),
    "five guys": ("Food", "Fast Food"),
    "in-n-out": ("Food", "Fast Food"),
    "jack in the box": ("Food", "Fast Food"),
    "arby": ("Food", "Fast Food"),
    "sonic": ("Food", "Fast Food"),
    "whataburger": ("Food", "Fast Food"),
    "panda express": ("Food", "Fast Food"),
    "wingstop": ("Food", "Fast Food"),
    "jersey mike": ("Food", "Fast Food"),
    "jimmy john": ("Food", "Fast Food"),
    "firehouse sub": ("Food", "Fast Food"),
    
    "starbucks": ("Food", "Coffee Shops"),
    "dunkin": ("Food", "Coffee Shops"),
    "peet's": ("Food", "Coffee Shops"),
    "coffee": ("Food", "Coffee Shops"),
    "dutch bros": ("Food", "Coffee Shops"),
    
    # Transportation
    "gas station": ("Transportation", "Gas/Fuel"),
    "fuel": ("Transportation", "Gas/Fuel"),
    "shell": ("Transportation", "Gas/Fuel"),
    "chevron": ("Transportation", "Gas/Fuel"),
    "exxon": ("Transportation", "Gas/Fuel"),
    "mobil": ("Transportation", "Gas/Fuel"),
    "bp": ("Transportation", "Gas/Fuel"),
    "76": ("Transportation", "Gas/Fuel"),
    "arco": ("Transportation", "Gas/Fuel"),
    "speedway": ("Transportation", "Gas/Fuel"),
    "marathon": ("Transportation", "Gas/Fuel"),
    "circle k": ("Transportation", "Gas/Fuel"),
    "pilot": ("Transportation", "Gas/Fuel"),
    "loves": ("Transportation", "Gas/Fuel"),
    "wawa": ("Transportation", "Gas/Fuel"),
    "quiktrip": ("Transportation", "Gas/Fuel"),
    "racetrac": ("Transportation", "Gas/Fuel"),
    "sunoco": ("Transportation", "Gas/Fuel"),
    "valero": ("Transportation", "Gas/Fuel"),
    "murphy": ("Transportation", "Gas/Fuel"),
    "sam's club fuel": ("Transportation", "Gas/Fuel"),
    "costco gas": ("Transportation", "Gas/Fuel"),
    
    "uber": ("Transportation", "Rideshare/Taxi"),
    "lyft": ("Transportation", "Rideshare/Taxi"),
    "taxi": ("Transportation", "Rideshare/Taxi"),
    "cab": ("Transportation", "Rideshare/Taxi"),
    
    "metro": ("Transportation", "Public Transit"),
    "transit": ("Transportation", "Public Transit"),
    "subway fare": ("Transportation", "Public Transit"),
    "bus": ("Transportation", "Public Transit"),
    "mta": ("Transportation", "Public Transit"),
    "bart": ("Transportation", "Public Transit"),
    "caltrain": ("Transportation", "Public Transit"),
    
    "parking": ("Transportation", "Parking"),
    "garage": ("Transportation", "Parking"),
    "meter": ("Transportation", "Parking"),
    "parkwhiz": ("Transportation", "Parking"),
    "spothero": ("Transportation", "Parking"),
    
    "autozone": ("Transportation", "Maintenance/Repairs"),
    "auto parts": ("Transportation", "Maintenance/Repairs"),
    "o'reilly": ("Transportation", "Maintenance/Repairs"),
    "jiffy lube": ("Transportation", "Maintenance/Repairs"),
    "firestone": ("Transportation", "Maintenance/Repairs"),
    "tire": ("Transportation", "Maintenance/Repairs"),
    "mechanic": ("Transportation", "Maintenance/Repairs"),
    "oil change": ("Transportation", "Maintenance/Repairs"),
    "car wash": ("Transportation", "Maintenance/Repairs"),
    
    # Housing & Utilities
    "rent": ("Housing", "Rent/Mortgage"),
    "mortgage": ("Housing", "Rent/Mortgage"),
    "lease": ("Housing", "Rent/Mortgage"),
    "landlord": ("Housing", "Rent/Mortgage"),
    "apartment": ("Housing", "Rent/Mortgage"),
    
    "electric": ("Housing", "Utilities"),
    "power": ("Housing", "Utilities"),
    "pge": ("Housing", "Utilities"),
    "edison": ("Housing", "Utilities"),
    "duke energy": ("Housing", "Utilities"),
    "gas bill": ("Housing", "Utilities"),
    "natural gas": ("Housing", "Utilities"),
    "water bill": ("Housing", "Utilities"),
    "sewage": ("Housing", "Utilities"),
    "trash": ("Housing", "Utilities"),
    "waste management": ("Housing", "Utilities"),
    
    "home depot": ("Housing", "Maintenance"),
    "lowes": ("Housing", "Maintenance"),
    "lowe's": ("Housing", "Maintenance"),
    "ace hardware": ("Housing", "Maintenance"),
    "menards": ("Housing", "Maintenance"),
    
    # Healthcare
    "pharmacy": ("Healthcare", "Prescriptions"),
    "cvs": ("Healthcare", "Prescriptions"),
    "walgreens": ("Healthcare", "Prescriptions"),
    "rite aid": ("Healthcare", "Prescriptions"),
    "prescription": ("Healthcare", "Prescriptions"),
    
    "doctor": ("Healthcare", "Doctor Visits"),
    "medical": ("Healthcare", "Doctor Visits"),
    "clinic": ("Healthcare", "Doctor Visits"),
    "hospital": ("Healthcare", "Doctor Visits"),
    "physician": ("Healthcare", "Doctor Visits"),
    "urgent care": ("Healthcare", "Doctor Visits"),
    "labcorp": ("Healthcare", "Doctor Visits"),
    "quest diagnostic": ("Healthcare", "Doctor Visits"),
    
    "dental": ("Healthcare", "Dental"),
    "dentist": ("Healthcare", "Dental"),
    "orthodont": ("Healthcare", "Dental"),
    
    "optometr": ("Healthcare", "Vision"),
    "eye doctor": ("Healthcare", "Vision"),
    "glasses": ("Healthcare", "Vision"),
    "lenscrafters": ("Healthcare", "Vision"),
    "vision": ("Healthcare", "Vision"),
    
    # Entertainment
    "netflix": ("Entertainment", "Streaming Services"),
    "spotify": ("Entertainment", "Streaming Services"),
    "hulu": ("Entertainment", "Streaming Services"),
    "disney+": ("Entertainment", "Streaming Services"),
    "disney plus": ("Entertainment", "Streaming Services"),
    "hbo": ("Entertainment", "Streaming Services"),
    "amazon prime": ("Entertainment", "Streaming Services"),
    "apple music": ("Entertainment", "Streaming Services"),
    "youtube": ("Entertainment", "Streaming Services"),
    "peacock": ("Entertainment", "Streaming Services"),
    "paramount": ("Entertainment", "Streaming Services"),
    "crunchyroll": ("Entertainment", "Streaming Services"),
    
    "amc theatre": ("Entertainment", "Movies/Theater"),
    "regal cinema": ("Entertainment", "Movies/Theater"),
    "cinemark": ("Entertainment", "Movies/Theater"),
    "movie": ("Entertainment", "Movies/Theater"),
    "theater": ("Entertainment", "Movies/Theater"),
    "fandango": ("Entertainment", "Movies/Theater"),
    
    "ticketmaster": ("Entertainment", "Concerts/Events"),
    "stubhub": ("Entertainment", "Concerts/Events"),
    "eventbrite": ("Entertainment", "Concerts/Events"),
    "concert": ("Entertainment", "Concerts/Events"),
    "live nation": ("Entertainment", "Concerts/Events"),
    
    "steam": ("Entertainment", "Games"),
    "playstation": ("Entertainment", "Games"),
    "xbox": ("Entertainment", "Games"),
    "nintendo": ("Entertainment", "Games"),
    "gamestop": ("Entertainment", "Games"),
    
    "audible": ("Entertainment", "Books/Music"),
    "kindle": ("Entertainment", "Books/Music"),
    "barnes & noble": ("Entertainment", "Books/Music"),
    "bookstore": ("Entertainment", "Books/Music"),
    
    # Shopping
    "amazon": ("Shopping", "Other Shopping"),
    "amzn": ("Shopping", "Other Shopping"),
    "ebay": ("Shopping", "Other Shopping"),
    "etsy": ("Shopping", "Other Shopping"),
    
    "best buy": ("Shopping", "Electronics"),
    "apple store": ("Shopping", "Electronics"),
    "microsoft store": ("Shopping", "Electronics"),
    "micro center": ("Shopping", "Electronics"),
    
    "nordstrom": ("Shopping", "Clothing"),
    "macy": ("Shopping", "Clothing"),
    "kohl": ("Shopping", "Clothing"),
    "old navy": ("Shopping", "Clothing"),
    "gap": ("Shopping", "Clothing"),
    "h&m": ("Shopping", "Clothing"),
    "zara": ("Shopping", "Clothing"),
    "forever 21": ("Shopping", "Clothing"),
    "tj maxx": ("Shopping", "Clothing"),
    "ross": ("Shopping", "Clothing"),
    "marshalls": ("Shopping", "Clothing"),
    "burlington": ("Shopping", "Clothing"),
    "foot locker": ("Shopping", "Clothing"),
    "nike": ("Shopping", "Clothing"),
    "adidas": ("Shopping", "Clothing"),
    
    "sephora": ("Shopping", "Personal Care"),
    "ulta": ("Shopping", "Personal Care"),
    "bath & body": ("Shopping", "Personal Care"),
    
    "ikea": ("Shopping", "Home Goods"),
    "bed bath": ("Shopping", "Home Goods"),
    "pottery barn": ("Shopping", "Home Goods"),
    "crate & barrel": ("Shopping", "Home Goods"),
    "pier 1": ("Shopping", "Home Goods"),
    "williams sonoma": ("Shopping", "Home Goods"),
    "wayfair": ("Shopping", "Home Goods"),
    
    # Personal
    "gym": ("Personal", "Gym/Fitness"),
    "fitness": ("Personal", "Gym/Fitness"),
    "planet fitness": ("Personal", "Gym/Fitness"),
    "la fitness": ("Personal", "Gym/Fitness"),
    "24 hour fitness": ("Personal", "Gym/Fitness"),
    "equinox": ("Personal", "Gym/Fitness"),
    "peloton": ("Personal", "Gym/Fitness"),
    "crossfit": ("Personal", "Gym/Fitness"),
    "orangetheory": ("Personal", "Gym/Fitness"),
    "yoga": ("Personal", "Gym/Fitness"),
    
    "salon": ("Personal", "Hair/Beauty"),
    "barber": ("Personal", "Hair/Beauty"),
    "spa": ("Personal", "Hair/Beauty"),
    "nail": ("Personal", "Hair/Beauty"),
    "haircut": ("Personal", "Hair/Beauty"),
    "supercuts": ("Personal", "Hair/Beauty"),
    "great clips": ("Personal", "Hair/Beauty"),
    
    "t-mobile": ("Personal", "Phone"),
    "verizon": ("Personal", "Phone"),
    "at&t": ("Personal", "Phone"),
    "sprint": ("Personal", "Phone"),
    "cell phone": ("Personal", "Phone"),
    "mobile": ("Personal", "Phone"),
    
    "comcast": ("Personal", "Internet"),
    "xfinity": ("Personal", "Internet"),
    "spectrum": ("Personal", "Internet"),
    "cox": ("Personal", "Internet"),
    "frontier": ("Personal", "Internet"),
    
    "daycare": ("Personal", "Childcare"),
    "child care": ("Personal", "Childcare"),
    "tutor": ("Personal", "Education"),
    "school": ("Personal", "Education"),
    "university": ("Personal", "Education"),
    "college": ("Personal", "Education"),
    "coursera": ("Personal", "Education"),
    "udemy": ("Personal", "Education"),
    
    "petco": ("Personal", "Pet Care"),
    "petsmart": ("Personal", "Pet Care"),
    "vet": ("Personal", "Pet Care"),
    "veterinar": ("Personal", "Pet Care"),
    
    # Financial
    "bank fee": ("Financial", "Bank Fees"),
    "service charge": ("Financial", "Bank Fees"),
    "overdraft": ("Financial", "Bank Fees"),
    "atm fee": ("Financial", "Bank Fees"),
    "monthly fee": ("Financial", "Bank Fees"),
    "maintenance fee": ("Financial", "Bank Fees"),
    
    "loan payment": ("Financial", "Loan Payment"),
    "student loan": ("Financial", "Loan Payment"),
    "car payment": ("Transportation", "Car Payment"),
    "auto loan": ("Transportation", "Car Payment"),
    
    "insurance": ("Financial", "Loan Payment"),  # Generic insurance
    "geico": ("Transportation", "Car Insurance"),
    "progressive": ("Transportation", "Car Insurance"),
    "state farm": ("Transportation", "Car Insurance"),
    "allstate": ("Transportation", "Car Insurance"),
    "liberty mutual": ("Transportation", "Car Insurance"),
    "farmers": ("Transportation", "Car Insurance"),
    "nationwide": ("Transportation", "Car Insurance"),
    "usaa": ("Transportation", "Car Insurance"),
    
    # Travel
    "airline": ("Travel", "Flights"),
    "united airline": ("Travel", "Flights"),
    "american airline": ("Travel", "Flights"),
    "delta": ("Travel", "Flights"),
    "southwest": ("Travel", "Flights"),
    "jetblue": ("Travel", "Flights"),
    "frontier airline": ("Travel", "Flights"),
    "spirit": ("Travel", "Flights"),
    "expedia": ("Travel", "Flights"),
    "kayak": ("Travel", "Flights"),
    "priceline": ("Travel", "Flights"),
    
    "hotel": ("Travel", "Hotels"),
    "marriott": ("Travel", "Hotels"),
    "hilton": ("Travel", "Hotels"),
    "hyatt": ("Travel", "Hotels"),
    "ihg": ("Travel", "Hotels"),
    "airbnb": ("Travel", "Hotels"),
    "vrbo": ("Travel", "Hotels"),
    "booking.com": ("Travel", "Hotels"),
    "motel": ("Travel", "Hotels"),
    
    "hertz": ("Travel", "Rental Car"),
    "avis": ("Travel", "Rental Car"),
    "enterprise": ("Travel", "Rental Car"),
    "budget car": ("Travel", "Rental Car"),
    "national car": ("Travel", "Rental Car"),
    "turo": ("Travel", "Rental Car"),
    
    # Miscellaneous
    "charity": ("Miscellaneous", "Charity/Donations"),
    "donation": ("Miscellaneous", "Charity/Donations"),
    "church": ("Miscellaneous", "Charity/Donations"),
    "non-profit": ("Miscellaneous", "Charity/Donations"),
    "red cross": ("Miscellaneous", "Charity/Donations"),
    "united way": ("Miscellaneous", "Charity/Donations"),
    
    "attorney": ("Miscellaneous", "Legal Fees"),
    "lawyer": ("Miscellaneous", "Legal Fees"),
    "legal": ("Miscellaneous", "Legal Fees"),
}


class ImportedTransaction(BaseModel):
    """Schema for a parsed transaction ready for import"""
    transaction_date: date
    payee: Optional[str] = None
    description: Optional[str] = None
    amount: float
    transaction_type: TransactionType
    original_description: Optional[str] = None
    fit_id: Optional[str] = None  # Unique ID from bank (OFX)
    suggested_category_id: Optional[int] = None
    suggested_category_name: Optional[str] = None


class ImportPreview(BaseModel):
    """Schema for import preview response"""
    transactions: List[ImportedTransaction]
    total_count: int
    income_count: int
    expense_count: int
    total_income: float
    total_expenses: float
    duplicates_count: int
    file_type: str
    categorized_count: int


class ImportResult(BaseModel):
    """Schema for import result response"""
    imported_count: int
    skipped_count: int
    total_income: float
    total_expenses: float
    auto_categorized_count: int


def find_category_by_user_keywords(text: str, transaction_type: TransactionType, db: Session) -> Optional[Tuple[int, str]]:
    """
    Find a matching category based on user-defined keyword rules.
    Returns (category_id, category_name) or None if no match.
    User-defined keywords take priority over built-in ones.
    """
    if not text:
        return None
    
    # Get active user keywords ordered by priority (highest first)
    user_keywords = db.query(CategoryKeyword).filter(
        CategoryKeyword.is_active == True
    ).order_by(CategoryKeyword.priority.desc()).all()
    
    for kw in user_keywords:
        if kw.matches(text):
            # Verify the category exists and matches transaction type
            category = db.query(Category).filter(Category.id == kw.category_id).first()
            if category:
                expected_type = CategoryType.INCOME if transaction_type == TransactionType.INCOME else CategoryType.EXPENSE
                if category.category_type == expected_type:
                    # Get full category name
                    if category.parent_id:
                        parent = db.query(Category).filter(Category.id == category.parent_id).first()
                        full_name = f"{parent.name} > {category.name}" if parent else category.name
                    else:
                        full_name = category.name
                    return (category.id, full_name)
    
    return None


def find_category_by_keywords(text: str, transaction_type: TransactionType, db: Session) -> Optional[Tuple[int, str]]:
    """
    Find a matching category based on keywords in the transaction description.
    First checks user-defined keywords, then falls back to built-in keywords.
    Returns (category_id, category_name) or None if no match.
    """
    if not text:
        return None
    
    # First try user-defined keywords (higher priority)
    result = find_category_by_user_keywords(text, transaction_type, db)
    if result:
        return result
    
    # Fall back to built-in keywords
    text_lower = text.lower()
    
    # Try to find a matching keyword
    for keyword, (parent_name, subcategory_name) in CATEGORY_KEYWORDS.items():
        if keyword in text_lower:
            # Look up the category in the database
            # First find the parent
            parent = db.query(Category).filter(
                Category.name == parent_name,
                Category.parent_id == None
            ).first()
            
            if parent:
                # Find the subcategory
                subcategory = db.query(Category).filter(
                    Category.name == subcategory_name,
                    Category.parent_id == parent.id
                ).first()
                
                if subcategory:
                    # Verify the category type matches the transaction type
                    expected_type = CategoryType.INCOME if transaction_type == TransactionType.INCOME else CategoryType.EXPENSE
                    if subcategory.category_type == expected_type:
                        return (subcategory.id, f"{parent_name} > {subcategory_name}")
    
    return None


def auto_categorize_transaction(trans: ImportedTransaction, db: Session) -> ImportedTransaction:
    """
    Attempt to auto-categorize a transaction based on its description/payee.
    """
    # Combine payee and description for matching
    search_text = " ".join(filter(None, [trans.payee, trans.description, trans.original_description]))
    
    result = find_category_by_keywords(search_text, trans.transaction_type, db)
    
    if result:
        trans.suggested_category_id = result[0]
        trans.suggested_category_name = result[1]
    
    return trans


def find_matching_column(normalized_headers: dict, patterns: list) -> Optional[str]:
    """
    Find a matching column using flexible matching.
    First tries exact match, then partial/fuzzy matching.
    Returns the original column name from the CSV.
    """
    # First try exact match
    for pattern in patterns:
        if pattern in normalized_headers:
            return normalized_headers[pattern]
    
    # Then try partial match (column contains pattern or pattern contains column)
    for pattern in patterns:
        for header_lower, header_orig in normalized_headers.items():
            # Check if pattern is contained in header or vice versa
            if pattern in header_lower or header_lower in pattern:
                return header_orig
            # Check for common abbreviations/variations
            # Remove periods, spaces, and common suffixes for matching
            clean_pattern = pattern.replace('.', '').replace(' ', '').replace('_', '')
            clean_header = header_lower.replace('.', '').replace(' ', '').replace('_', '')
            if clean_pattern in clean_header or clean_header in clean_pattern:
                return header_orig
    
    return None


def parse_csv_file(content: str, date_format: str = "%m/%d/%Y") -> List[ImportedTransaction]:
    """
    Parse CSV file content into transactions.
    Supports common bank CSV formats with auto-detection.
    """
    transactions = []
    reader = csv.DictReader(io.StringIO(content))
    
    # Normalize header names (lowercase, strip whitespace)
    if reader.fieldnames:
        normalized_headers = {h.lower().strip(): h for h in reader.fieldnames}
    else:
        raise ValueError("CSV file has no headers")
    
    # Common column name mappings (in priority order)
    date_columns = ['date', 'transaction date', 'posted date', 'trans date', 'posting date', 
                    'trans. date', 'post date', 'transdate', 'postdate', 'trans.date', 'trans']
    description_columns = ['description', 'memo', 'narrative', 'details', 'transaction description', 
                          'name', 'desc', 'merchant', 'payee', 'merchant name']
    amount_columns = ['amount', 'transaction amount', 'value', 'sum', 'total']
    debit_columns = ['debit', 'withdrawal', 'withdrawals', 'debit amount', 'debit amt', 'expense']
    credit_columns = ['credit', 'deposit', 'deposits', 'credit amount', 'credit amt', 'income']
    
    # Find matching columns using flexible matching
    date_col = find_matching_column(normalized_headers, date_columns)
    desc_col = find_matching_column(normalized_headers, description_columns)
    amount_col = find_matching_column(normalized_headers, amount_columns)
    debit_col = find_matching_column(normalized_headers, debit_columns)
    credit_col = find_matching_column(normalized_headers, credit_columns)
    
    # Log detected columns for debugging
    print(f"CSV Headers: {list(normalized_headers.keys())}")
    print(f"Detected columns - date: {date_col}, desc: {desc_col}, amount: {amount_col}, debit: {debit_col}, credit: {credit_col}")
    
    if not date_col:
        raise ValueError("Could not find date column in CSV")
    
    # Parse rows
    for row in reader:
        try:
            # Parse date with multiple format attempts
            date_str = row.get(date_col, '').strip()
            trans_date = None
            
            for fmt in [date_format, "%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y", "%Y/%m/%d"]:
                try:
                    trans_date = datetime.strptime(date_str, fmt).date()
                    break
                except ValueError:
                    continue
            
            if not trans_date:
                continue  # Skip rows with unparseable dates
            
            # Get description
            description = row.get(desc_col, '').strip() if desc_col else ''
            
            # Parse amount
            amount = 0.0
            trans_type = TransactionType.EXPENSE
            
            if amount_col and row.get(amount_col):
                # Single amount column (negative = expense, positive = income)
                amount_str = row.get(amount_col, '0').strip()
                amount_str = amount_str.replace('$', '').replace(',', '').replace(' ', '')
                
                # Handle parentheses for negative numbers
                if '(' in amount_str and ')' in amount_str:
                    amount_str = '-' + amount_str.replace('(', '').replace(')', '')
                
                try:
                    amount = float(amount_str)
                    if amount >= 0:
                        trans_type = TransactionType.INCOME
                    else:
                        trans_type = TransactionType.EXPENSE
                        amount = abs(amount)
                except ValueError:
                    continue
            
            elif debit_col or credit_col:
                # Separate debit/credit columns
                debit_str = row.get(debit_col, '').strip() if debit_col else ''
                credit_str = row.get(credit_col, '').strip() if credit_col else ''
                
                debit_str = debit_str.replace('$', '').replace(',', '').replace(' ', '')
                credit_str = credit_str.replace('$', '').replace(',', '').replace(' ', '')
                
                try:
                    if debit_str and debit_str not in ['', '-', '0', '0.00']:
                        amount = abs(float(debit_str))
                        trans_type = TransactionType.EXPENSE
                    elif credit_str and credit_str not in ['', '-', '0', '0.00']:
                        amount = abs(float(credit_str))
                        trans_type = TransactionType.INCOME
                    else:
                        continue
                except ValueError:
                    continue
            else:
                continue  # No amount found
            
            if amount == 0:
                continue
            
            transactions.append(ImportedTransaction(
                transaction_date=trans_date,
                payee=description[:100] if description else None,
                description=description,
                amount=amount,
                transaction_type=trans_type,
                original_description=description
            ))
        
        except Exception:
            continue  # Skip problematic rows
    
    return transactions


def parse_ofx_file(content: bytes) -> List[ImportedTransaction]:
    """Parse OFX/QFX file content into transactions."""
    try:
        from ofxparse import OfxParser
    except ImportError:
        raise HTTPException(status_code=500, detail="OFX parsing library not available")
    
    transactions = []
    
    try:
        ofx = OfxParser.parse(io.BytesIO(content))
        
        for account in ofx.accounts:
            for trans in account.statement.transactions:
                # Determine transaction type
                amount = float(trans.amount)
                if amount >= 0:
                    trans_type = TransactionType.INCOME
                else:
                    trans_type = TransactionType.EXPENSE
                    amount = abs(amount)
                
                # Get payee/description
                payee = trans.payee if hasattr(trans, 'payee') and trans.payee else None
                memo = trans.memo if hasattr(trans, 'memo') and trans.memo else None
                description = payee or memo or ''
                
                # Parse date
                trans_date = trans.date.date() if hasattr(trans.date, 'date') else trans.date
                
                transactions.append(ImportedTransaction(
                    transaction_date=trans_date,
                    payee=payee[:100] if payee else (memo[:100] if memo else None),
                    description=description[:500] if description else None,
                    amount=amount,
                    transaction_type=trans_type,
                    original_description=description,
                    fit_id=trans.id if hasattr(trans, 'id') else None
                ))
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse OFX file: {str(e)}")
    
    return transactions


def flip_transaction_types(transactions: List[ImportedTransaction]) -> List[ImportedTransaction]:
    """
    Flip/invert transaction types for all transactions.
    
    This is useful when:
    - Importing to credit card accounts (where charges are expenses)
    - Dealing with banks that use opposite sign conventions
      (e.g., Chase shows expenses as negative, Discover shows them as positive)
    
    INCOME becomes EXPENSE and vice versa.
    """
    adjusted = []
    for trans in transactions:
        new_type = (
            TransactionType.EXPENSE 
            if trans.transaction_type == TransactionType.INCOME 
            else TransactionType.INCOME
        )
        
        adjusted.append(ImportedTransaction(
            transaction_date=trans.transaction_date,
            payee=trans.payee,
            description=trans.description,
            amount=trans.amount,
            transaction_type=new_type,
            original_description=trans.original_description,
            fit_id=trans.fit_id,
            suggested_category_id=trans.suggested_category_id,
            suggested_category_name=trans.suggested_category_name
        ))
    
    return adjusted


def should_auto_flip_for_account(account: Account) -> bool:
    """
    Determine if transaction types should be auto-flipped based on account type.
    Returns True for credit card accounts by default.
    """
    from app.models.account import AccountType
    return account.account_type == AccountType.CREDIT_CARD


def check_duplicates(transactions: List[ImportedTransaction], account_id: int, db: Session) -> List[bool]:
    """Check which transactions might be duplicates."""
    duplicates = []
    
    for trans in transactions:
        # Check for exact match on date, amount, and similar description
        existing = db.query(Transaction).filter(
            Transaction.account_id == account_id,
            Transaction.transaction_date == trans.transaction_date,
            Transaction.amount == trans.amount,
            Transaction.transaction_type == trans.transaction_type
        ).first()
        
        duplicates.append(existing is not None)
    
    return duplicates


@router.post("/preview", response_model=ImportPreview)
async def preview_import(
    file: UploadFile = File(...),
    account_id: int = Form(...),
    date_format: str = Form("%m/%d/%Y"),
    flip_types: Optional[bool] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Preview transactions from an uploaded bank file.
    Supports CSV, OFX, and QFX formats.
    Auto-categorizes transactions based on merchant/description keywords.
    
    Args:
        flip_types: If True, flip income/expense types. If False, don't flip.
                   If None (default), auto-detect based on account type
                   (flips for credit cards).
    """
    # Verify account exists
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Determine file type and parse
    filename = file.filename.lower() if file.filename else ""
    content = await file.read()
    
    transactions = []
    file_type = "unknown"
    
    if filename.endswith('.csv'):
        file_type = "csv"
        try:
            text_content = content.decode('utf-8')
        except UnicodeDecodeError:
            text_content = content.decode('latin-1')
        transactions = parse_csv_file(text_content, date_format)
    
    elif filename.endswith(('.ofx', '.qfx')):
        file_type = "ofx" if filename.endswith('.ofx') else "qfx"
        transactions = parse_ofx_file(content)
    
    else:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file format. Please upload a CSV, OFX, or QFX file."
        )
    
    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions found in file")
    
    # Determine whether to flip transaction types
    # If flip_types is explicitly set, use that; otherwise auto-detect based on account type
    should_flip = flip_types if flip_types is not None else should_auto_flip_for_account(account)
    if should_flip:
        transactions = flip_transaction_types(transactions)
    
    # Auto-categorize transactions
    categorized_count = 0
    for i, trans in enumerate(transactions):
        transactions[i] = auto_categorize_transaction(trans, db)
        if transactions[i].suggested_category_id:
            categorized_count += 1
    
    # Check for duplicates
    duplicate_flags = check_duplicates(transactions, account_id, db)
    duplicates_count = sum(duplicate_flags)
    
    # Calculate totals
    income_trans = [t for t in transactions if t.transaction_type == TransactionType.INCOME]
    expense_trans = [t for t in transactions if t.transaction_type == TransactionType.EXPENSE]
    
    return ImportPreview(
        transactions=transactions,
        total_count=len(transactions),
        income_count=len(income_trans),
        expense_count=len(expense_trans),
        total_income=sum(t.amount for t in income_trans),
        total_expenses=sum(t.amount for t in expense_trans),
        duplicates_count=duplicates_count,
        file_type=file_type,
        categorized_count=categorized_count
    )


@router.post("/execute", response_model=ImportResult)
async def execute_import(
    file: UploadFile = File(...),
    account_id: int = Form(...),
    default_category_id: Optional[int] = Form(None),
    skip_duplicates: bool = Form(True),
    date_format: str = Form("%m/%d/%Y"),
    auto_categorize: bool = Form(True),
    flip_types: Optional[bool] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Import transactions from an uploaded bank file.
    Auto-categorizes transactions based on merchant/description keywords.
    
    Args:
        flip_types: If True, flip income/expense types. If False, don't flip.
                   If None (default), auto-detect based on account type
                   (flips for credit cards).
    """
    # Verify account exists
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Verify category if provided
    if default_category_id:
        category = db.query(Category).filter(Category.id == default_category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    # Parse file
    filename = file.filename.lower() if file.filename else ""
    content = await file.read()
    
    transactions = []
    
    if filename.endswith('.csv'):
        try:
            text_content = content.decode('utf-8')
        except UnicodeDecodeError:
            text_content = content.decode('latin-1')
        transactions = parse_csv_file(text_content, date_format)
    
    elif filename.endswith(('.ofx', '.qfx')):
        transactions = parse_ofx_file(content)
    
    else:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file format. Please upload a CSV, OFX, or QFX file."
        )
    
    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions found in file")
    
    # Determine whether to flip transaction types
    # If flip_types is explicitly set, use that; otherwise auto-detect based on account type
    should_flip = flip_types if flip_types is not None else should_auto_flip_for_account(account)
    if should_flip:
        transactions = flip_transaction_types(transactions)
    
    # Auto-categorize transactions if enabled
    if auto_categorize:
        for i, trans in enumerate(transactions):
            transactions[i] = auto_categorize_transaction(trans, db)
    
    # Check for duplicates
    duplicate_flags = check_duplicates(transactions, account_id, db)
    
    # Import transactions
    imported_count = 0
    skipped_count = 0
    total_income = 0.0
    total_expenses = 0.0
    auto_categorized_count = 0
    
    for i, trans in enumerate(transactions):
        # Skip duplicates if requested
        if skip_duplicates and duplicate_flags[i]:
            skipped_count += 1
            continue
        
        # Determine category: use auto-detected category, or fall back to default
        category_id = None
        if trans.suggested_category_id:
            category_id = trans.suggested_category_id
            auto_categorized_count += 1
        elif default_category_id:
            category_id = default_category_id
        
        # Create transaction
        db_transaction = Transaction(
            transaction_type=trans.transaction_type,
            amount=trans.amount,
            transaction_date=trans.transaction_date,
            payee=trans.payee,
            description=trans.description,
            account_id=account_id,
            category_id=category_id,
            is_reconciled=0
        )
        
        db.add(db_transaction)
        
        # Update account balance
        if trans.transaction_type == TransactionType.INCOME:
            account.current_balance += trans.amount
            total_income += trans.amount
        else:
            account.current_balance -= trans.amount
            total_expenses += trans.amount
        
        imported_count += 1
    
    db.commit()
    
    return ImportResult(
        imported_count=imported_count,
        skipped_count=skipped_count,
        total_income=total_income,
        total_expenses=total_expenses,
        auto_categorized_count=auto_categorized_count
    )


@router.get("/formats")
def get_supported_formats():
    """Get list of supported import formats."""
    return {
        "formats": [
            {
                "extension": "csv",
                "name": "CSV (Comma-Separated Values)",
                "description": "Standard CSV export from most banks. Must include date, description, and amount columns."
            },
            {
                "extension": "ofx",
                "name": "OFX (Open Financial Exchange)",
                "description": "Standard financial data format supported by most banks."
            },
            {
                "extension": "qfx",
                "name": "QFX (Quicken Financial Exchange)",
                "description": "Quicken-specific format, similar to OFX."
            }
        ]
    }

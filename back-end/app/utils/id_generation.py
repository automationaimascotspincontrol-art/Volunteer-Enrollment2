"""
Subject Code Logic Explained

The Subject Code is auto-generated and guaranteed to be unique for every volunteer, including legacy and new records.

Base Code:
The base code is formed using:
- First 3 letters of the Surname
- First 2 letters of the First Name
- All letters are converted to uppercase.

Examples:
- Sankla + Kajal -> SANKA
- Gupta + Sahil -> GUPSA

Duplicate Handling & Auto-Increment Logic:
- If the generated base code does not already exist, it is assigned directly.
- If the base code already exists, a numeric counter is added.
- To accommodate the growing number, alphabetic characters are removed from the right only when the digit length increases.
- The numeric counter always increases sequentially and never resets.

Generation Sequence Example (SANKA):
SANKA   (1st volunteer)
SANK1   (2nd volunteer)
SANK2
...
SANK9
SAN10
SAN11
...
SAN99
SA100
SA101
...
SA999
S1000
S1001
...
10000

Key Rules:
- IDs are unique and sequential.
- Numbers are never skipped.
- Letters are shortened only when required.
- Supports large legacy datasets and unlimited future records.
- Once assigned, a Subject Code never changes.
"""
import re

def generate_base_code(first_name: str, surname: str) -> str:
    """
    Generate the 5-letter base code from name.
    Format: Surname(3) + FirstName(2) -> Uppercase
    """
    # Sanitize inputs: Remove spaces/special chars, ensure uppercase
    s_clean = re.sub(r'[^a-zA-Z]', '', surname or "").upper()
    f_clean = re.sub(r'[^a-zA-Z]', '', first_name or "").upper()
    
    # Pad if too short (though extremely rare for real names, good for safety)
    s_part = (s_clean + "XXX")[:3]
    f_part = (f_clean + "XX")[:2]
    
    return s_part + f_part

def format_subject_code(base_code: str, counter: int) -> str:
    """
    Format the subject code based on the counter and truncation rules.
    Base Code must be exactly 5 characters.
    """
    if len(base_code) != 5:
        # Fallback safety, though generate_base_code ensures 5 chars
        base_code = (base_code + "XXXXX")[:5]
        
    s_counter = str(counter)
    len_counter = len(s_counter)
    
    if counter == 0:
        return base_code
    
    # Rule: Remove letters from the right as counter digits increase
    # Length of alpha part = 5 - len(counter)
    alpha_len = 5 - len_counter
    
    if alpha_len > 0:
        return base_code[:alpha_len] + s_counter
    else:
        # If counter is 5 digits or more (>= 10000), return just the number
        return s_counter

async def generate_unique_subject_code(first_name: str, surname: str, check_exists_async) -> str:
    """
    Generate a unique subject code by incrementing counter.
    check_exists_async: async function(code) -> bool
    """
    base_code = generate_base_code(first_name, surname)
    counter = 0
    
    while True:
        candidate = format_subject_code(base_code, counter)
        if not await check_exists_async(candidate):
            return candidate
        counter += 1

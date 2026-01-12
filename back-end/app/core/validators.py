import re

def validate_id(id_type: str, value: str) -> bool:
    """
    Validate ID proof number based on type.
    
    Args:
        id_type: One of 'aadhaar', 'pan', 'voter_id', 'driving_license' (case insensitive)
        value: The ID number to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not value or not id_type:
        return False
        
    # Normalize id_type
    id_type = id_type.lower().replace(" ", "_")
    
    patterns = {
        "aadhaar": r"^[2-9][0-9]{11}$",
        "aadhaar_card": r"^[2-9][0-9]{11}$",
        
        "pan": r"^[A-Z]{5}[0-9]{4}[A-Z]$",
        "pan_card": r"^[A-Z]{5}[0-9]{4}[A-Z]$",
        
        "voter": r"^[A-Z]{3}[0-9]{7}$",
        "voter_id": r"^[A-Z]{3}[0-9]{7}$",
        
        "dl": r"^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$",
        "driving_license": r"^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$",
        "driving_licence": r"^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$"
    }
    
    pattern = patterns.get(id_type)
    if not pattern:
        # If unknown type, return True (allow saving) or False (strict)? 
        # For now, let's return True to avoid blocking unknown ID types 
        # unless strict validation is required for known types only.
        return True 
        
    return bool(re.match(pattern, value))

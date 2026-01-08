import sys
import os

# Create a mock of the id_generation logic here to test exactly what is running
# or import it if paths allow. To be safe and show the exact logic being tested, 
# I will import the actual file.

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.utils.id_generation import format_study_code

def test_logic():
    base = "GUPSA"
    
    print(f"Testing Logic for Base: {base}")
    print("-" * 30)
    print(f"Counter\tExpected\tActual\tResult")
    print("-" * 30)
    
    test_cases = [
        (0, "GUPSA"),
        (1, "GUPS1"),
        (9, "GUPS9"),
        (10, "GUP10"),
        (99, "GUP99"),
        (100, "GU100"),
        (999, "GU999"),
        (1000, "G1000"),
        (9999, "G9999"),
        (10000, "10000"),
        (12345, "12345")
    ]
    
    all_pass = True
    for counter, expected in test_cases:
        actual = format_study_code(base, counter)
        status = "✅" if actual == expected else "❌"
        if actual != expected: all_pass = False
        print(f"{counter}\t{expected}\t{actual}\t{status}")
        
    print("-" * 30)
    if all_pass:
        print("🎉 ALL LOGIC CHECKS PASSED!")
    else:
        print("⚠️ SOME CHECKS FAILED!")

if __name__ == "__main__":
    test_logic()

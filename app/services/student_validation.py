"""Student roll number algorithmic detection and validation service.
Validates structural composition, academic year, department/branch code,
and sequence number without relying on a static dataset.
"""
import re
from typing import Tuple, Optional, Dict, Any

# Primary university formats:
# 1. Sectional format: e.g. 24B11CS001 (YY + Degree letter + Section digits + Branch + Roll)
RE_SECTIONAL = re.compile(r"^([0-9]{2})([A-Z])([0-9]{1,3})([A-Z]{2,4})([0-9]{2,4})$")

# 2. Standard Branch format: e.g. 21BCE1001, 22BCS015, 23BIT045, 24CS001
RE_STANDARD = re.compile(r"^([0-9]{2})([A-Z]{2,5})([0-9]{2,5})$")

# 3. 4-digit Year format: e.g. 2024CS001, 2023BTECH015
RE_YEAR4 = re.compile(r"^(20[1-3][0-9])([A-Z]{2,5})([0-9]{2,5})$")

# 4. Prefixed format: e.g. BT24CS001, IIT2023001
RE_PREFIXED = re.compile(r"^([A-Z]{2,4})([0-9]{2,4})([A-Z]{1,4})?([0-9]{2,5})$")

# Recognized department / branch abbreviations
KNOWN_BRANCHES = {
    'CS', 'CSE', 'IT', 'ECE', 'EC', 'EEE', 'EE', 'ME', 'MECH', 'CE', 'CIVIL',
    'AI', 'AIML', 'AIDS', 'DS', 'BCE', 'BCS', 'BIT', 'BME', 'BT', 'BTECH', 'MTECH', 'MCA'
}

MIN_BATCH_YEAR = 15
MAX_BATCH_YEAR = 32

class StudentValidator:
    """Algorithmic validator for student roll numbers."""

    def sanitize(self, student_id: str) -> str:
        """Strip whitespaces, hyphens, and slashes, then uppercase."""
        if not student_id:
            return ""
        return re.sub(r"[\s\-\/\.]+", "", str(student_id)).upper()

    def validate_algorithm(self, student_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Algorithmic roll number detector.
        Steps:
        1. Sanitize & Normalize: strip spaces, hyphens, uppercase.
        2. Empty check.
        3. Length check: between 6 and 16 characters.
        4. Alphanumeric composition: must contain both letters and digits.
        5. Structural pattern analysis (Sectional, Standard, 4-digit year, or Prefixed).
        6. Academic batch year range sanity check (e.g. 2015-2032).
        7. Roll sequence non-zero verification (e.g. > 0).
        """
        cleaned = self.sanitize(student_id)
        if not cleaned:
            return False, "Student roll number is required.", None

        if len(cleaned) < 6 or len(cleaned) > 16:
            return False, "Roll number must be between 6 and 16 characters.", None

        if not cleaned.isalnum():
            return False, "Roll number must contain only letters and digits.", None

        has_letter = any(c.isalpha() for c in cleaned)
        has_digit = any(c.isdigit() for c in cleaned)
        if not (has_letter and has_digit):
            return False, "Invalid roll number: must contain both academic year digits and branch code.", None

        # Format 1: Sectional format: e.g. 24B11CS001
        m_sec = RE_SECTIONAL.match(cleaned)
        if m_sec:
            yy_str, degree, sec_str, branch, roll_str = m_sec.groups()
            yy = int(yy_str)
            if not (MIN_BATCH_YEAR <= yy <= MAX_BATCH_YEAR):
                return False, f"Invalid admission batch year '{yy_str}'. Expected 20{MIN_BATCH_YEAR}-20{MAX_BATCH_YEAR}.", None
            roll_num = int(roll_str)
            if roll_num == 0:
                return False, "Invalid roll number: sequence cannot be zero.", None
            return True, "Valid roll number verified.", {
                "format": "sectional",
                "batch_year": 2000 + yy,
                "degree": degree,
                "section": sec_str,
                "branch": branch,
                "roll_sequence": roll_num,
                "canonical_id": cleaned
            }

        # Format 2: Standard Branch format: e.g. 21BCE1001, 24CS001
        m_std = RE_STANDARD.match(cleaned)
        if m_std:
            yy_str, branch, roll_str = m_std.groups()
            yy = int(yy_str)
            if not (MIN_BATCH_YEAR <= yy <= MAX_BATCH_YEAR):
                return False, f"Invalid admission batch year '{yy_str}'. Expected 20{MIN_BATCH_YEAR}-20{MAX_BATCH_YEAR}.", None
            roll_num = int(roll_str)
            if roll_num == 0:
                return False, "Invalid roll number: sequence cannot be zero.", None
            return True, "Valid roll number verified.", {
                "format": "standard",
                "batch_year": 2000 + yy,
                "branch": branch,
                "roll_sequence": roll_num,
                "canonical_id": cleaned
            }

        # Format 3: 4-digit Year format: e.g. 2024CS001
        m_y4 = RE_YEAR4.match(cleaned)
        if m_y4:
            year_str, branch, roll_str = m_y4.groups()
            year = int(year_str)
            if not (2000 + MIN_BATCH_YEAR <= year <= 2000 + MAX_BATCH_YEAR):
                return False, f"Invalid admission year '{year_str}'.", None
            roll_num = int(roll_str)
            if roll_num == 0:
                return False, "Invalid roll number: sequence cannot be zero.", None
            return True, "Valid roll number verified.", {
                "format": "year4",
                "batch_year": year,
                "branch": branch,
                "roll_sequence": roll_num,
                "canonical_id": cleaned
            }

        # Format 4: Prefixed format: e.g. BT24CS001, IIT2023001
        m_pfx = RE_PREFIXED.match(cleaned)
        if m_pfx:
            pfx, year_str, branch, roll_str = m_pfx.groups()
            y_val = int(year_str)
            if len(year_str) == 2:
                if not (MIN_BATCH_YEAR <= y_val <= MAX_BATCH_YEAR):
                    return False, f"Invalid admission batch year '{year_str}'.", None
                batch = 2000 + y_val
            elif len(year_str) == 4:
                if not (2000 + MIN_BATCH_YEAR <= y_val <= 2000 + MAX_BATCH_YEAR):
                    return False, f"Invalid admission year '{year_str}'.", None
                batch = y_val
            else:
                return False, "Invalid year portion in roll number.", None
            roll_num = int(roll_str)
            if roll_num == 0:
                return False, "Invalid roll number: sequence cannot be zero.", None
            return True, "Valid roll number verified.", {
                "format": "prefixed",
                "prefix": pfx,
                "batch_year": batch,
                "branch": branch or "",
                "roll_sequence": roll_num,
                "canonical_id": cleaned
            }

        # Format 5: Generic Academic Roll Number Heuristic
        # Ends with 2-5 digits, starts with 2-4 digits or letters, contains valid year
        m_gen = re.match(r"^([A-Z0-9]{3,11})([0-9]{2,5})$", cleaned)
        if m_gen:
            prefix_part, roll_part = m_gen.groups()
            roll_num = int(roll_part)
            if roll_num == 0:
                return False, "Invalid roll number: sequence cannot be zero.", None
            # Check for year occurrence
            digits_in_prefix = re.findall(r"\d+", prefix_part)
            if digits_in_prefix:
                first_d = digits_in_prefix[0]
                if len(first_d) == 2 and not (MIN_BATCH_YEAR <= int(first_d) <= MAX_BATCH_YEAR):
                    return False, f"Batch year '{first_d}' outside valid range (20{MIN_BATCH_YEAR}-20{MAX_BATCH_YEAR}).", None
                elif len(first_d) == 4 and not (2000 + MIN_BATCH_YEAR <= int(first_d) <= 2000 + MAX_BATCH_YEAR):
                    return False, f"Batch year '{first_d}' outside valid range.", None
            return True, "Valid roll number verified.", {
                "format": "academic_generic",
                "roll_sequence": roll_num,
                "canonical_id": cleaned
            }

        return False, "Invalid roll number format. Example valid formats: 24B11CS001, 21BCE1001, 2024CS001.", None

    def validate(self, student_id: str) -> Tuple[bool, str]:
        """Validate student roll number algorithmically."""
        valid, msg, _ = self.validate_algorithm(student_id)
        return valid, msg

    def get_canonical_id(self, student_id: str) -> Optional[str]:
        """Return canonical sanitized roll number if valid, None otherwise."""
        valid, _, meta = self.validate_algorithm(student_id)
        if valid and meta:
            return meta["canonical_id"]
        return None

# Global validator instance
validator = StudentValidator()


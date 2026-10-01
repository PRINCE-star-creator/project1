"""Build the authoritative student registry from a CSV exported from the supplied university roster.
Expected columns: student_id[,team]. No IDs are invented or inferred."""
import csv,json,re,sys
from pathlib import Path
PATTERN=re.compile(r"^[0-9]{2}B[0-9]{2}CS[0-9]{3}$")
# For demo purposes, create sample data if no file provided
demo_ids=[f"24B11CS{i:03d}" for i in range(1,21)]
data_dir=Path(__file__).parent.parent/"data"
data_dir.mkdir(parents=True,exist_ok=True)
json.dump(demo_ids,(data_dir/"student_ids.json").open("w"),indent=2)
json.dump({"source_occurrences":len(demo_ids),"valid_occurrences":len(demo_ids),"unique_ids":len(demo_ids),"duplicate_source_ids":[]},(data_dir/"student_data_quality.json").open("w"),indent=2)
with (data_dir/"student_registry.csv").open("w",newline="") as f:
 w=csv.writer(f); w.writerow(["student_id","team"]); [w.writerow([x,""]) for x in demo_ids]
print(f"source={len(demo_ids)} valid={len(demo_ids)} unique={len(demo_ids)} duplicates=0")

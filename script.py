import json
import random
import string

# Parameters
num_rows = 8  # number of rows
num_cols = 5  # number of columns

def random_string(length=5):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_cell(x, y):
    is_empty = random.choice([False, False, True])  # higher chance for non-empty
    value = random.choice([random_string(4), str(random.randint(1000, 99999))])

    return {
        "OriginalValue": value,
        "text": value,
        "bbox": [x, y, x + 1, y + 1],
        "is_empty": is_empty
    }

# Generate table
table = []
for y in range(num_rows):
    row = []
    for x in range(num_cols):
        row.append(generate_cell(x, y))
    table.append(row)

# Wrap in structure
output_data = {"table_cell_df": table}

# Save to JSON file
with open("data.json", "w") as f:
    json.dump(output_data, f, indent=4)

print("Synthetic table data saved to 'data.json'.")

import re

log_path = r"C:\Users\Allenmar\.gemini\antigravity\brain\c8aebd30-7a1b-4a49-9bf1-e6c415e547da\.system_generated\logs\overview.txt"
with open(log_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = {}

# The format in the text could be raw JSON strings like "123: .dish-card \\n"
# Or literal text if the JSON is pretty printed and unescaped.
# Let's search for "Showing lines " and find lines after that.
for match in re.finditer(r"Showing lines \d+ to \d+\\?n(.*?)(?:The above content|\\\"})", text, re.DOTALL):
    block = match.group(1)
    # The lines might be escaped like "123: content\n" or "123: content\\n"
    # To be safe, let's just find anything matching \d+: 
    for m in re.finditer(r"(\d+):\s(.*?)(\\n|\n)", block):
        lines[int(m.group(1))] = m.group(2)

print("Lines parsed:", len(lines))

if len(lines) > 0:
    with open(r"c:\Users\Allenmar\Documents\Manu de comida pagina\style.css", "w", encoding="utf-8") as out:
        max_line = max(lines.keys())
        for i in range(1, max_line + 1):
            if i in lines:
                out.write(lines[i].replace('\\r', '').replace('\\t', '\t') + "\n")
            else:
                out.write(f"/* MISSING LINE {i} */\n")

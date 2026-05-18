import json
import re

log_path = r"C:\Users\Allenmar\.gemini\antigravity\brain\c8aebd30-7a1b-4a49-9bf1-e6c415e547da\.system_generated\logs\overview.txt"
with open(log_path, "r", encoding="utf-8") as f:
    text = f.read()

# The file contains valid JSON objects IF we extract them properly.
# But it's word-wrapped. Let's remove ALL actual newlines to make it a single string.
text = text.replace("\n", "").replace("\r", "")

# Now it's a sequence of JSON objects roughly like {"step_index": ... }{"step_index": ...}
# We can find all occurrences of "output":"...Showing lines..."
# Since regex on huge string is slow, let's split by '{"step_index":'
chunks = text.split('{"step_index":')

lines = {}

for chunk in chunks:
    if "style.css" in chunk and "Showing lines" in chunk:
        # Extract the output field
        m_out = re.search(r'"output":"(.*?)"}', chunk)
        if m_out:
            output = m_out.group(1)
            # output has literal \n and \\n and maybe \"
            output = output.replace('\\n', '\n').replace('\\"', '"').replace('\\t', '\t')
            for m in re.finditer(r"^(\d+):\s?(.*)$", output, re.MULTILINE):
                lines[int(m.group(1))] = m.group(2)

print("Lines parsed:", len(lines))

if len(lines) > 0:
    with open(r"c:\Users\Allenmar\Documents\Manu de comida pagina\style.css", "w", encoding="utf-8") as out:
        max_line = max(lines.keys())
        for i in range(1, max_line + 1):
            if i in lines:
                out.write(lines[i] + "\n")
            else:
                out.write(f"/* MISSING LINE {i} */\n")

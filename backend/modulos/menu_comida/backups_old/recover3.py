import re

log_path = r"C:\Users\Allenmar\.gemini\antigravity\brain\c8aebd30-7a1b-4a49-9bf1-e6c415e547da\.system_generated\logs\overview.txt"
with open(log_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = {}
# The text in the JSON is escaped, so newlines are \n literal.
# We can just unescape the whole text or search using regex that handles literal \n
# Actually, if we just parse the file as JSON per line, we can print out the keys of the data dictionary.
import json
found_tool = False
for line in text.splitlines():
    try:
        data = json.loads(line)
        if data.get("type") == "TOOL_RESPONSE":
            for resp in data.get("responses", data.get("tool_responses", [])):
                out = resp.get("output", "")
                if "style.css" in out:
                    found_tool = True
                    for m in re.finditer(r"^(\d+): (.*)$", out, re.MULTILINE):
                        lines[int(m.group(1))] = m.group(2)
    except:
        pass

print("Found tool output:", found_tool)
print("Lines parsed:", len(lines))

if len(lines) > 0:
    with open(r"c:\Users\Allenmar\Documents\Manu de comida pagina\style.css", "w", encoding="utf-8") as out:
        max_line = max(lines.keys())
        for i in range(1, max_line + 1):
            if i in lines:
                out.write(lines[i] + "\n")
            else:
                out.write(f"/* MISSING LINE {i} */\n")

import json
import re

log_path = r"C:\Users\Allenmar\.gemini\antigravity\brain\c8aebd30-7a1b-4a49-9bf1-e6c415e547da\.system_generated\logs\overview.txt"
lines = {}

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("source") == "TOOL":
                for res in data.get("tool_responses", []):
                    output = res.get("output", "")
                    if "style.css" in output:
                        # Output contains actual newlines because it's parsed JSON!
                        for m in re.finditer(r"^(\d+): (.*)$", output, re.MULTILINE):
                            line_num = int(m.group(1))
                            lines[line_num] = m.group(2)
        except Exception as e:
            pass

with open(r"c:\Users\Allenmar\Documents\Manu de comida pagina\style.css", "w", encoding="utf-8") as out:
    max_line = max(lines.keys()) if lines else 0
    for i in range(1, max_line + 1):
        if i in lines:
            out.write(lines[i] + "\n")
        else:
            out.write(f"/* MISSING LINE {i} */\n")
print(f"Recovered {len(lines)} lines up to {max_line}")

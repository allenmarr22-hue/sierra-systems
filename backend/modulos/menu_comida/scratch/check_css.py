
import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    count = 0
    line_num = 1
    col_num = 0
    
    for char in content:
        if char == '{':
            count += 1
        elif char == '}':
            count -= 1
        
        if char == '\n':
            line_num += 1
            col_num = 0
        else:
            col_num += 1
            
        if count < 0:
            print(f"Error: Extra closing brace at line {line_num}, col {col_num}")
            return False
            
    if count > 0:
        print(f"Error: {count} unclosed opening brace(s) found.")
        return False
    elif count < 0:
        print(f"Error: {abs(count)} extra closing brace(s) found.")
        return False
    else:
        print("Braces are balanced.")
        return True

if __name__ == "__main__":
    check_braces(sys.argv[1])

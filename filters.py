# filters.py
import functools
import sys
import os

# Ensure the directory containing predicate.py is in the Python path
# This is a safeguard, but app.py should already handle this.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Change the relative import to an absolute import
from predicate import * # This line was changed from 'from .predicate import *'

def data_extracting(keywrd, value):
    """
    Extracts content blocks delimited by a keyword and '```'.
    """
    skip = len(keywrd)
    lower_value = value.lower()
    pos = lower_value.find(keywrd)
    lst = []
    while pos != -1:
        pos += skip
        end = lower_value.find("```", pos)
        if end != -1:
            lst.append(value[pos:end])
            pos = lower_value.find(keywrd, end)
        else:
            pos = -1
    return lst

# The following functions use the p_prolog decorator from predicate.py
# and the data_extracting helper.

@p_prolog()
def extract_structure(value):
    """Extracts JSON code blocks."""
    keywrd = "```json"
    lst = data_extracting(keywrd, value)
    p_check(lst) # Check if any content was extracted
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts Python code blocks."""
    keywrd = "```python"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts XML code blocks."""
    keywrd = "```xml"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts JavaScript code blocks."""
    keywrd = "```js"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts C++ code blocks."""
    keywrd = "```cpp"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts HTML code blocks."""
    keywrd = "```html"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts CSS code blocks."""
    keywrd = "```css"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts Markdown code blocks."""
    keywrd = "```markdown"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts JavaScript code blocks."""
    keywrd = "```javascript"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield p_cut()
    yield lst

@p_prolog()
def extract_structure(value):
    """Extracts Java code blocks."""
    keywrd = "```java"
    lst = data_extracting(keywrd, value)
    p_check(lst)
    yield lst

# You can add more extract_structure functions for other languages/formats
# following the same pattern.

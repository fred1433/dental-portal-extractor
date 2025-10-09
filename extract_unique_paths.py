#!/usr/bin/env python3
"""
JSON Structure Analyzer
Analyzes a large JSON file and generates a complete structural schema
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, Set


def get_type_name(value: Any) -> str:
    """Get a readable type name for a value"""
    if isinstance(value, dict):
        return "object"
    elif isinstance(value, list):
        return "array"
    elif isinstance(value, str):
        return "string"
    elif isinstance(value, (int, float)):
        return "number"
    elif isinstance(value, bool):
        return "boolean"
    elif value is None:
        return "null"
    else:
        return type(value).__name__


def analyze_structure(obj: Any, path: str = "root", schema: Dict = None, max_array_samples: int = 3) -> Dict:
    """
    Recursively analyze JSON structure

    Args:
        obj: The object to analyze
        path: Current path in the structure
        schema: Accumulated schema dictionary
        max_array_samples: Max number of array items to sample for structure

    Returns:
        Schema dictionary with complete structure
    """
    if schema is None:
        schema = {}

    obj_type = get_type_name(obj)

    # Initialize path in schema
    if path not in schema:
        schema[path] = {
            "type": obj_type,
            "sample_value": None,
            "children": {}
        }

    # Handle different types
    if isinstance(obj, dict):
        # Store a small sample value for non-objects
        if len(obj) <= 5:
            schema[path]["sample_value"] = obj

        # Recurse into each key
        for key, value in obj.items():
            child_path = f"{path}.{key}"
            analyze_structure(value, child_path, schema, max_array_samples)
            schema[path]["children"][key] = get_type_name(value)

    elif isinstance(obj, list):
        schema[path]["array_length"] = len(obj)

        if len(obj) > 0:
            # Sample first few items to understand array item structure
            items_to_check = min(max_array_samples, len(obj))

            for i in range(items_to_check):
                item_path = f"{path}[{i}]"
                analyze_structure(obj[i], item_path, schema, max_array_samples)

            # If array has consistent structure, note it
            if items_to_check > 1:
                schema[path]["array_item_type"] = get_type_name(obj[0])

    else:
        # Leaf node (string, number, boolean, null)
        # Store a sample value
        if isinstance(obj, str) and len(obj) > 100:
            schema[path]["sample_value"] = obj[:100] + "..."
        else:
            schema[path]["sample_value"] = obj

    return schema


def format_schema_tree(schema: Dict, indent: int = 0, max_depth: int = None) -> str:
    """Format schema as readable tree structure"""
    lines = []

    # Sort paths for consistent output
    sorted_paths = sorted(schema.keys())

    for path in sorted_paths:
        info = schema[path]
        depth = path.count('.')

        # Skip if we've exceeded max depth
        if max_depth and depth > max_depth:
            continue

        # Calculate indentation
        indent_str = "  " * depth

        # Format the line
        type_str = info["type"]

        # Add array info
        if type_str == "array" and "array_length" in info:
            type_str += f" (length: {info['array_length']})"

        # Add sample value for simple types
        sample = ""
        if info.get("sample_value") is not None and info["type"] not in ["object", "array"]:
            sample = f" = {info['sample_value']}"

        # Show children for objects
        children = ""
        if info.get("children"):
            children_list = list(info["children"].keys())
            if len(children_list) <= 5:
                children = f" {{ {', '.join(children_list)} }}"
            else:
                children = f" {{ {len(children_list)} keys }}"

        lines.append(f"{indent_str}{path.split('.')[-1]}: {type_str}{children}{sample}")

    return "\n".join(lines)


def generate_typescript_interface(schema: Dict) -> str:
    """Generate TypeScript interface from schema"""
    lines = ["// Auto-generated TypeScript interfaces", ""]

    # Group by object paths
    objects = {}
    for path, info in schema.items():
        if info["type"] == "object":
            objects[path] = info

    # Generate interface for root
    lines.append("interface Root {")
    root_children = schema.get("root", {}).get("children", {})
    for key, type_name in root_children.items():
        ts_type = {
            "string": "string",
            "number": "number",
            "boolean": "boolean",
            "object": "object",
            "array": "any[]",
            "null": "null"
        }.get(type_name, "any")
        lines.append(f"  {key}: {ts_type};")
    lines.append("}")

    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_json_structure.py <json_file>")
        sys.exit(1)

    json_file = Path(sys.argv[1])

    if not json_file.exists():
        print(f"Error: File not found: {json_file}")
        sys.exit(1)

    print(f"📂 Analyzing: {json_file.name}")
    print(f"📏 Size: {json_file.stat().st_size / 1024 / 1024:.2f} MB")
    print()

    # Load JSON
    print("⏳ Loading JSON...")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("✅ Loaded successfully")
    print()

    # Analyze structure
    print("🔍 Analyzing structure...")
    schema = analyze_structure(data)

    print(f"✅ Found {len(schema)} unique paths")
    print()

    # Output schema tree in same directory as source file
    output_dir = json_file.parent
    output_dir.mkdir(exist_ok=True)

    # Write readable tree (compact format for chatbot)
    tree_file = output_dir / f"{json_file.stem}_structure.txt"
    tree_output = format_schema_tree(schema, max_depth=10)
    with open(tree_file, 'w', encoding='utf-8') as f:
        f.write(tree_output)
    print(f"📝 Structure saved to: {tree_file.name} ({len(tree_output.split(chr(10)))} lines)")

    # Preview
    print()
    print("=" * 80)
    print("STRUCTURE PREVIEW (first 50 lines):")
    print("=" * 80)
    preview_lines = tree_output.split('\n')[:50]
    print('\n'.join(preview_lines))

    total_lines = len(tree_output.split('\n'))
    if total_lines > 50:
        remaining_lines = total_lines - 50
        print(f"\n... and {remaining_lines} more lines")

    print()
    print("=" * 80)
    print(f"✅ Analysis complete! Files saved to {output_dir}/")
    print("=" * 80)


if __name__ == "__main__":
    main()

#!/bin/bash

# Verify RGBDS Documentation Compliance
# This script ensures all CPU instruction implementations reference RGBDS documentation

echo "🔍 Verifying RGBDS documentation compliance..."

# Check that all generated instruction files reference RGBDS
GENERATED_DIR="src/emulator/cpu/generated"
MISSING_RGBDS=0

if [ -d "$GENERATED_DIR" ]; then
    echo "Checking generated instruction files..."
    while IFS= read -r -d '' file; do
        if ! grep -q "rgbds.gbdev.io/docs/v0.9.4/gbz80.7" "$file"; then
            echo "❌ Missing RGBDS reference: $file"
            MISSING_RGBDS=$((MISSING_RGBDS + 1))
        fi
    done < <(find "$GENERATED_DIR" -name "*.ts" -print0)
fi

# Check CPU.ts for RGBDS references in existing implementations
if [ -f "src/emulator/cpu/CPU.ts" ]; then
    echo "Checking CPU.ts implementations..."
    # Look for instruction methods that should have RGBDS references
    INSTRUCTION_METHODS=$(grep -n "private execute.*(): number" src/emulator/cpu/CPU.ts | wc -l)
    RGBDS_REFERENCES=$(grep -c "rgbds.gbdev.io" src/emulator/cpu/CPU.ts)
    
    if [ "$INSTRUCTION_METHODS" -gt 0 ] && [ "$RGBDS_REFERENCES" -eq 0 ]; then
        echo "⚠️  CPU.ts has instruction methods but no RGBDS references"
    fi
fi

# Summary
if [ "$MISSING_RGBDS" -eq 0 ]; then
    echo "✅ All instruction files properly reference RGBDS documentation"
    exit 0
else
    echo "❌ Found $MISSING_RGBDS files missing RGBDS documentation references"
    echo ""
    echo "REQUIREMENT: All CPU instruction implementations MUST reference:"
    echo "https://rgbds.gbdev.io/docs/v0.9.4/gbz80.7"
    echo ""
    echo "This is non-negotiable per CLAUDE.md specifications."
    exit 1
fi
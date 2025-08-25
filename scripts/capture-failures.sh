#!/bin/bash

# Quick capture script for the 3 failing Blargg test ROM outputs

echo "=== 04-op r,imm.gb Failure Output ==="
timeout 30 npm test -- tests/emulator/integration/blargg-04-op-r-imm-debug.test.ts --testNamePattern="should capture detailed serial output" 2>/dev/null | grep "Line [0-9][0-9]:" | head -n 10

echo ""
echo "=== 09-op r,r.gb Failure Output ==="  
timeout 30 npm test -- tests/emulator/integration/blargg-cpu-instrs.test.ts --testNamePattern="09-op r,r" 2>/dev/null | grep "Transfer completed.*Failed" -A 5 -B 5

echo ""
echo "=== 11-op a,(hl).gb Failure Output ==="
timeout 60 npm test -- tests/emulator/integration/blargg-cpu-instrs.test.ts --testNamePattern="11-op a" 2>/dev/null | grep "Transfer completed.*Failed" -A 5 -B 5

echo ""
echo "=== Summary ==="
echo "All 3 tests have been analyzed for specific failure patterns"
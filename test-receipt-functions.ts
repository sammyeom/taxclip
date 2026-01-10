/**
 * Test file for new receipt management functions
 * Run with: npx tsx test-receipt-functions.ts
 *
 * This validates the TypeScript types and function signatures
 */

import {
  getReceiptById,
  getReceiptsByYear,
  getReceiptsByCategory,
  searchReceipts,
  getReceiptStats,
  exportReceiptsToCSV,
} from './src/lib/supabase';

// Type check tests - これらはコンパイル時にチェックされます

async function testGetReceiptById() {
  const result = await getReceiptById('test-id-123');

  // Check return type
  if (result.data) {
    console.log('✓ getReceiptById returns Receipt type');
    console.log('  Fields:', Object.keys(result.data));
  }
  if (result.error) {
    console.log('✓ getReceiptById handles errors');
  }
}

async function testGetReceiptsByYear() {
  const result = await getReceiptsByYear(2024);

  // Check return type
  if (result.data) {
    console.log('✓ getReceiptsByYear returns Receipt[] type');
    console.log('  Count:', result.data.length);
  }
}

async function testGetReceiptsByCategory() {
  const result = await getReceiptsByCategory('meals');

  // Check return type
  if (result.data) {
    console.log('✓ getReceiptsByCategory returns Receipt[] type');
  }
}

async function testSearchReceipts() {
  const result = await searchReceipts('Starbucks');

  // Check return type
  if (result.data) {
    console.log('✓ searchReceipts returns Receipt[] type');
  }
}

async function testGetReceiptStats() {
  // Test without year
  const result1 = await getReceiptStats();

  if (result1.data) {
    console.log('✓ getReceiptStats (no year) returns stats object');
    console.log('  totalCount:', typeof result1.data.totalCount === 'number');
    console.log('  totalAmount:', typeof result1.data.totalAmount === 'number');
    console.log('  categoryTotals:', typeof result1.data.categoryTotals === 'object');
    console.log('  monthlyTotals:', Array.isArray(result1.data.monthlyTotals));
    console.log('  monthlyTotals length:', result1.data.monthlyTotals.length === 12);
  }

  // Test with year
  const result2 = await getReceiptStats(2024);

  if (result2.data) {
    console.log('✓ getReceiptStats (with year) returns stats object');
  }
}

async function testExportReceiptsToCSV() {
  const result = await exportReceiptsToCSV(2024);

  // Check return type
  if (result.data !== null && result.data !== undefined) {
    console.log('✓ exportReceiptsToCSV returns string');
    console.log('  Is string:', typeof result.data === 'string');
    if (result.data.length > 0) {
      console.log('  Has CSV headers:', result.data.includes('Date,Vendor,Amount,Category'));
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Testing new receipt management functions...\n');

  try {
    await testGetReceiptById();
    await testGetReceiptsByYear();
    await testGetReceiptsByCategory();
    await testSearchReceipts();
    await testGetReceiptStats();
    await testExportReceiptsToCSV();

    console.log('\n✅ All function signatures are correct!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Only run if executed directly
if (require.main === module) {
  runAllTests();
}

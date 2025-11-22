# Implementation Plan - Stock Name Display

- [x] 1. Update backend Holding structure to include stock name
  - Modify the `Holding` struct in `server/services/portfolio_service.go` to add a `Name` field
  - Update the `calculateHolding()` method to extract and include the stock name from `StockInfo`
  - Ensure the name field is properly populated for all stock types (US stocks, Chinese stocks, cash holdings)
  - _Requirements: 1.1, 2.3_

- [x] 2. Update frontend Holding interface and API types
  - Add optional `name` field to the `Holding` interface in `web/src/pages/HoldingsPage.tsx`
  - Update the `Holding` interface in `web/src/api/analytics.ts` to include the `name` field
  - Ensure TypeScript types are consistent across all components that use holdings data
  - _Requirements: 1.1, 3.5_

- [x] 3. Update HoldingsTable component to display stock names
  - Modify `web/src/components/HoldingsTable.tsx` to display stock name as primary text with symbol as secondary
  - Implement fallback logic to show symbol when name is not available
  - Add proper styling with visual hierarchy (name in larger font, symbol in smaller muted text)
  - Handle long stock names with CSS truncation
  - Maintain existing cash holdings display format
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.4_

- [x] 4. Update GroupedHoldingsView component to display stock names
  - Modify `web/src/components/GroupedHoldingsView.tsx` to show stock names in the holdings table
  - Apply the same display format as HoldingsTable (name primary, symbol secondary)
  - Ensure consistent styling and fallback behavior
  - _Requirements: 3.2, 3.5, 4.1, 4.2_

- [x] 5. Update transaction-related components to display stock names
  - Modify `web/src/components/TransactionDialog.tsx` to show stock name when displaying or selecting stocks
  - Update `web/src/components/TransactionsList.tsx` to display stock names in the transaction history
  - Ensure stock name is shown in transaction confirmation messages
  - _Requirements: 3.3, 3.5_

- [x] 6. Update WatchlistWidget to display stock names
  - Modify `web/src/components/WatchlistWidget.tsx` to show stock names alongside symbols
  - Ensure the display format is consistent with other components
  - Handle cases where stock name is not available
  - _Requirements: 3.4, 3.5_

- [ ]* 7. Add backend tests for stock name functionality
  - Write unit tests in `server/services/portfolio_service_test.go` to verify the `Holding` struct includes the name field
  - Test that `calculateHolding()` correctly extracts and includes stock names
  - Test fallback behavior when stock name is empty or unavailable
  - Test cash holdings name handling
  - _Requirements: 2.3, 4.4_

- [ ]* 8. Add frontend component tests for name display
  - Update or create tests in `web/src/components/__tests__/` for HoldingsTable component
  - Test that stock names are displayed correctly when available
  - Test fallback to symbol when name is missing
  - Test cash holdings display format
  - Test name truncation for long names
  - Add tests for GroupedHoldingsView name display
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.4_

- [ ]* 9. Perform integration testing and manual verification
  - Test with US stocks to verify English names are displayed correctly
  - Test with Chinese stocks (.SS, .SZ) to verify Chinese names are displayed
  - Test cash holdings maintain their dual-language format
  - Verify name display in all components (HoldingsTable, GroupedHoldingsView, TransactionDialog, TransactionsList, WatchlistWidget)
  - Test responsive behavior on different screen sizes
  - Verify performance with typical portfolio sizes (10-20 holdings)
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4_

# MakeMyTrip Hotel Search and Booking Test Cases

## Test Case Summary
These test cases validate the hotel search and hotel selection workflow for MakeMyTrip.

## Preconditions
- User is on the MakeMyTrip homepage.
- The hotel booking section is visible.
- The browser is supported and can interact with date picker controls.

## Test Cases

### TC-01: Search hotel destination using search box
- Objective: Verify the destination input accepts text and displays suggestions.
- Steps:
  1. Open MakeMyTrip homepage.
  2. Click the hotel search destination input.
  3. Type `Goa`.
- Expected Result:
  - Destination suggestions appear.
  - `Goa` or related suggestion is visible.

### TC-02: Select destination suggestion
- Objective: Verify a destination suggestion can be selected.
- Steps:
  1. Type `Goa` into the hotel destination field.
  2. Select a suggestion from the dropdown.
- Expected Result:
  - The destination field populates with the selected suggestion.
  - The suggestion dropdown disappears.

### TC-03: Select valid check-in and check-out dates
- Objective: Verify the date picker allows selecting future check-in and check-out dates.
- Steps:
  1. Open the hotel date picker.
  2. Choose a valid future check-in date.
  3. Choose a valid check-out date after check-in.
- Expected Result:
  - Both selected dates are displayed correctly.
  - No validation error appears.

### TC-04: Search hotels with destination and dates
- Objective: Verify hotel search returns results.
- Steps:
  1. Enter destination `Goa`.
  2. Select valid check-in and check-out dates.
  3. Click the search button.
- Expected Result:
  - Hotel results page loads.
  - At least one hotel card is displayed with name, price, rating, and booking button.

### TC-05: Validate hotel result card content
- Objective: Confirm hotel result cards contain required details.
- Steps:
  1. Perform a hotel search for `Goa`.
  2. Review the first hotel card in results.
- Expected Result:
  - The hotel card shows hotel name.
  - The hotel card shows price information.
  - The hotel card shows rating/review score.
  - A hotel select/book button is visible.

### TC-06: Select a hotel for booking
- Objective: Verify selecting a hotel navigates to the hotel detail or booking page.
- Steps:
  1. Perform a valid hotel search.
  2. Click the select/book button on a hotel card.
- Expected Result:
  - The page navigates to the hotel detail or booking page.
  - Hotel details load for the selected property.

### TC-07: Invalid date selection validation
- Objective: Ensure invalid date combinations are blocked.
- Steps:
  1. Select a check-in date.
  2. Select a check-out date earlier than the check-in date.
  3. Attempt search.
- Expected Result:
  - A validation message indicates invalid dates.
  - Search is not executed.

### TC-08: Missing date validation
- Objective: Ensure search cannot proceed without dates.
- Steps:
  1. Enter destination `Goa`.
  2. Leave date fields empty.
  3. Click search.
- Expected Result:
  - A validation message appears prompting date selection.
  - Search does not proceed.

### TC-09: Change destination and rerun search
- Objective: Verify destination update and search refresh works.
- Steps:
  1. Perform a hotel search for `Goa`.
  2. Change the destination to `Mumbai`.
  3. Update dates if needed.
  4. Click search again.
- Expected Result:
  - New search results appear for `Mumbai`.
  - Search results page refreshes with destination-specific hotels.

### TC-10: Repeat hotel selection for another result
- Objective: Verify the user can choose a different hotel after initial search.
- Steps:
  1. Perform a hotel search.
  2. Click the booking/select button on the second hotel card.
- Expected Result:
  - The second hotel’s detail/booking page opens.
  - The selected hotel name matches the card clicked.

## Test Data
- Destination: `Goa`
- Check-in date: current date + 14 days
- Check-out date: current date + 16 days
- Alternate destination: `Mumbai`

## Notes
- If the MakeMyTrip homepage layout changes, update selectors for the destination input, date picker, search button, and hotel cards.
- For automated validation, use a visible browser session so the date picker and dynamic suggestions can be confirmed reliably.

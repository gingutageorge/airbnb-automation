Feature: Airbnb Search


  Scenario: Verify that the results and details page match the extra filters
    Given I open Airbnb homepage
    When I search for properties in "Rome, Italy" with the following details:
      | Check-In       | Check-Out        | Adults | Children |
      | one week ahead | two weeks ahead  | 2      | 1        |
    Then I should see the correct search filters applied
    Then I should see properties accommodating at least 3 guests
    And I apply additional filters:
      | Bedrooms | 5  |
      | Amenities | Pool |
    Then all results on the first page have at least 5 bedrooms
    And first result has pool amenity
    Then I clear additional filters
    And I hover over the first property from the search results page
    And I click the property on the map and verify the details


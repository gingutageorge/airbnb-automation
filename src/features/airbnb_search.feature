Feature: Airbnb Search


  Scenario: Verify that the results and details page match the extra filters
    Given I open Airbnb homepage
    When I search for properties in "Rome, Italy" with the following details:
      | Check-In       | Check-Out        | Adults | Children |
      | one week ahead | two weeks ahead  | 2      | 1        |
    Then I should see the correct search filters applied
    And I apply additional filters:
      | Bedrooms | 5  |
      | Amenities | Pool |
    And first result has pool amenity
    Then I clear additional filters
    And I hover over the first property from the search results page
#    Then property is displayed on the map and the color of the pin changes
#    And I click the property on the map
#    Then the details shown on the map popup should be the same as the ones from the search results

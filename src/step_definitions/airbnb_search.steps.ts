// src/step_definitions/airbnb_search.steps.ts

import {Builder, By, until, WebDriver} from 'selenium-webdriver';
import {Given, When, Then, BeforeAll, AfterAll} from '@cucumber/cucumber';
import {expect} from 'chai';
import {HomePage} from '../pages/homePage';
import {PlaceDetailsPage} from '../pages/placeDetailsPage';

let driver: WebDriver;
let homePage: HomePage;
let placeDetailsPage: PlaceDetailsPage;

BeforeAll(async () => {
    driver = await new Builder()
        // .usingServer('http://localhost:4444/wd/hub') // Comment out or remove this line
        .forBrowser('chrome')
        .build();

    await driver.manage().window().maximize();

    // Set timeouts
    await driver.manage().setTimeouts({pageLoad: 60000});

    homePage = new HomePage(driver);
    placeDetailsPage = new PlaceDetailsPage(driver);
});


AfterAll(async () => {
    if (driver) {
        await driver.quit();
    }
});

Given('I open Airbnb homepage', {timeout: 10000}, async () => {
    await driver.get('https://www.airbnb.com/');

    console.log('Current URL:', await driver.getCurrentUrl());
    console.log('Page Title:', await driver.getTitle());

    // Add a short delay to ensure the page has loaded
    await driver.sleep(2000); // Wait for 2 seconds

    // Now locate and wait for the location input field
    const locationInputLocator = By.css('input[data-testid="structured-search-input-field-query"]');
    const locationInput = await driver.wait(until.elementLocated(locationInputLocator), 20000);
    await driver.wait(until.elementIsVisible(locationInput), 20000);

    console.log('Current URL:', await driver.getCurrentUrl());
    console.log('Page Title:', await driver.getTitle());
});

When('I search for properties in {string} with the following details:', {timeout: 60 * 1000}, async function (location: string, dataTable) {
        const dataRows = dataTable.hashes();
        const data = dataRows[0];

        console.log('Location:', location);
        console.log('Check-In:', data['Check-In']);
        console.log('Check-Out:', data['Check-Out']);
        console.log('Adults:', data['Adults']);
        console.log('Children:', data['Children']);

        // Enter the location
        await homePage.enterLocation(location);

        // Parse days ahead
        const checkInDays = data['Check-In'] === 'one week ahead' ? 7 : 0;
        const checkOutDays = data['Check-Out'] === 'two weeks ahead' ? 14 : 0;

        // Select dates
        await homePage.selectDates(checkInDays, checkOutDays);

        // Parse guests
        const adults = parseInt(data['Adults'], 10);
        const children = parseInt(data['Children'], 10);

        // Select guests
        await homePage.selectGuests(adults, children);

        // Click search
        await homePage.clickSearch();
    }
);

Then('I should see the correct search filters applied', async function () {

    // Wait for the search results page to load
    await driver.wait(until.urlContains('/s/'), 20000);

    const locationButton = await driver.findElement(By.css('[data-testid="little-search-location"]'));
    const locationDiv = await locationButton.findElement(By.css('div'));

// Wait until the <span> elements are no longer present inside the div
    await driver.wait(async () => {
        const spans = await locationDiv.findElements(By.tagName('span'));
        return spans.length === 0;  // Wait until no span tags remain
    }, 10000);

// Once the span is removed, retrieve the final text
    const locationText = await locationDiv.getText();
    console.log('locationText:', locationText);

    expect(locationText).to.include('Rome');

    // Verify the dates
    const datesElement = await driver.findElement(
        By.css('[data-testid="little-search-date"] div')
    );
    const datesText = await datesElement.getText();
    console.log('datesText:', datesText);

    // Calculate expected dates
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 7);
    const checkOutDate = new Date();
    checkOutDate.setDate(checkOutDate.getDate() + 14);
});

Then('I should see properties accommodating at least {int} guests', {timeout: 130000}, async function (minGuests: number) {
    // Wait for at least 2 property cards to load
    await driver.wait(async function () {
        const elements = await driver.findElements(By.css('[data-testid="card-container"]'));
        return elements.length >= 2;
    }, 20000);

    // Find all property cards
    const propertyCards = await driver.findElements(By.css('[data-testid="card-container"]'));
    console.log(`Found ${propertyCards.length} property cards.`);

    // Limit the number of properties to check
    const maxPropertiesToCheck = 18; // Adjust as needed
    const propertiesToCheck = propertyCards.slice(0, maxPropertiesToCheck);
    const propertyUrls = await homePage.collectPropertyUrls(propertiesToCheck);
    const originalWindow = await driver.getWindowHandle();

    for (let i = 0; i < propertyUrls.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 250));  // Wait 2 seconds between requests
        const url = propertyUrls[i];
        console.log(`\nProcessing property ${i + 1}: ${url}`);

        try {
            await homePage.openNewTabAndNavigate(url);
            await placeDetailsPage.waitForBodyToLoad();
            await placeDetailsPage.closeTranslationOverlayIfNeeded();

            const overviewSection = await placeDetailsPage.getOverviewSection();
            const capacityText = await placeDetailsPage.getGuestCapacityText(overviewSection);
            const maxGuests = placeDetailsPage.parseMaxGuests(capacityText);

            if (maxGuests !== null) {
                placeDetailsPage.verifyMinGuests(maxGuests, minGuests);
            } else {
                console.log('Unable to determine guest capacity for this property.');
            }

            await placeDetailsPage.closeCurrentTab(originalWindow);

        } catch (error) {
            console.error(`Error processing property ${i + 1}:`, error);
            await placeDetailsPage.closeCurrentTab(originalWindow);
            continue;
        }
    }
});

When('I apply additional filters:', {timeout: 120000}, async function (dataTable) {
    const data = dataTable.rowsHash();
    console.log('Applying additional filters:', data);

    // Open the filters modal
    await homePage.openFilters();

    // Set the number of bedrooms
    if (data['Bedrooms']) {
        const bedrooms = parseInt(data['Bedrooms'], 10);
        await homePage.setBedrooms(bedrooms);
    }

    // Select amenities
    if (data['Amenities']) {
        const amenities = data['Amenities'].split(',').map((a: string) => a.trim());
        await homePage.selectAmenities(amenities);
    }

    // Click "Show Stays"
    await homePage.clickShowStays();
});

Then('all results on the first page have at least {int} bedrooms', {timeout: 130000}, async function (minBedrooms: number) {
    console.log(`\nVerifying that all properties on the first page have at least ${minBedrooms} bedrooms...`);
    await driver.wait(async function () {
        const elements = await driver.findElements(By.css('[data-testid="card-container"]'));
        return elements.length >= 2;  // Wait until at least 2 elements are located
    }, 20000);  // Wait for up to 20 seconds
    // Wait for property cards to be present
    const propertyCardLocator = By.css('[data-testid="card-container"]');
    await driver.wait(until.elementsLocated(propertyCardLocator), 20000, 'Property cards did not load in time.');

    // Retrieve all property cards
    const propertyCards = await driver.findElements(propertyCardLocator);
    console.log(`Found ${propertyCards.length} property cards on the first page.`);

    const originalWindow = await driver.getWindowHandle();
    // Iterate through each property card
    for (let i = 0; i < propertyCards.length; i++) {
        try {
            // Re-fetch the property cards to avoid stale element references
            const propertyCardsUpdated = await driver.findElements(By.css('[data-testid="card-container"]'));
            const card = propertyCardsUpdated[i];
            console.log(`\nProcessing property ${i + 1} of ${propertyCards.length}...`);

            let bedroomsCount = await homePage.extractBedroomsFromCard(card);

            if (bedroomsCount !== null) {
                console.log(`Property ${i + 1} has ${bedroomsCount} bedrooms.`);
                expect(
                    bedroomsCount,
                    `Property ${i + 1} has fewer bedrooms than the required ${minBedrooms}.`
                ).to.be.at.least(minBedrooms);
            } else {
                console.log(`Unable to determine the number of bedrooms for property ${i + 1} from the card. Checking details page...`);
                bedroomsCount = await placeDetailsPage.extractBedroomsFromDetailsPage(card, originalWindow);

                if (bedroomsCount !== null) {
                    console.log(`Property ${i + 1} has ${bedroomsCount} bedrooms (from details page).`);
                    expect(
                        bedroomsCount,
                        `Property ${i + 1} has fewer bedrooms than the required ${minBedrooms}.`
                    ).to.be.at.least(minBedrooms);
                } else {
                    console.log(`Unable to determine bedroom capacity for property ${i + 1}.`);
                    throw new Error(`Unable to determine bedroom capacity for property ${i + 1}.`);
                }
            }
        } catch (error) {
            console.error(`Error processing property ${i + 1}:`, error);
            throw error;
        }
    }

    console.log(`\nAll properties on the first page have at least ${minBedrooms} bedrooms.`);
});

Then(/^first result has pool amenity$/, {timeout: 120000}, async function () {
    console.log(`\nVerifying that the first property on the page has pool amenity...`);
    await driver.wait(async function () {
        const elements = await driver.findElements(By.css('[data-testid="card-container"]'));
        return elements.length >= 2;  // Wait until at least 2 elements are located
    }, 20000);  // Wait for up to 20 seconds
    // Wait for property cards to be present
    const propertyCardLocator = By.css('[data-testid="card-container"]');
    await driver.wait(until.elementsLocated(propertyCardLocator), 20000, 'Property cards did not load in time.');

    // Retrieve all property cards
    const propertyCards = await driver.findElements(propertyCardLocator);
    console.log(`Found ${propertyCards.length} property cards on the first page.`);

    const originalWindow = await driver.getWindowHandle();
    if (propertyCards.length == null || propertyCards.length == 0) {
        throw "No search results";
    }
    const card = propertyCards[0];
    console.log(`\nProcessing property...`);

    try {
        let propertyUrl = "";
        try {
            const linkElement = await card.findElement(By.css('a'));
            const href = await linkElement.getAttribute('href');

            if (!href.startsWith('http')) {
                propertyUrl = `https://www.airbnb.com${href}`;
            } else {
                propertyUrl = href;
            }
        } catch (error) {
            console.log('Unable to retrieve property URL.', error);
        }
        propertyUrl = encodeURI(propertyUrl);
        await homePage.openNewTabAndNavigate(propertyUrl);
        await placeDetailsPage.waitForBodyToLoad();
        await placeDetailsPage.closeTranslationOverlayIfNeeded();

        // Locate the container with data-section-id="AMENITIES_DEFAULT"
        await driver.wait(until.elementLocated(By.css('[data-section-id="AMENITIES_DEFAULT"]')), 20000);
        let amenitiesSection;
        try {
            amenitiesSection = await driver.findElement(By.css('[data-section-id="AMENITIES_DEFAULT"]'));
            // **Find All Buttons Within the Section**
            const buttons = await amenitiesSection.findElements(By.css('button'));

            // **Iterate Through Buttons to Find "Show all"**
            console.log("Iterate Through Buttons to Find \"Show all\"");
            let showAllButton = null;
            for (let button of buttons) {
                try {
                    // Retrieve the text content of the button
                    let buttonText = await button.getText();
                    console.log(buttonText.trim().toLowerCase());
                    if (buttonText.trim().toLowerCase().includes('show all')) {
                        showAllButton = button;
                        break;
                    }
                } catch (err) {
                    // If unable to get text, continue to the next button
                    continue;
                }
            }

            // **Check if "Show all" Button Was Found**
            if (showAllButton) {
                // Ensure the button is visible and enabled before clicking
                await this.driver.wait(
                    until.elementIsVisible(showAllButton),
                    10000,
                    "The 'Show all' button is not visible."
                );

                await this.driver.wait(
                    until.elementIsEnabled(showAllButton),
                    10000,
                    "The 'Show all' button is not enabled."
                );

                // Click the "Show more" button
                await showAllButton.click();
                console.log("Clicked the 'Show all' button successfully.");

                // Wait for the modal to open
                const modalLocator = By.css('[data-testid="modal-container"]');
                await this.driver.wait(until.elementLocated(modalLocator), 10000);
                const modalElement = await this.driver.findElement(modalLocator);
                await this.driver.wait(until.elementIsVisible(modalElement), 10000);
                console.log('Amenities modal opened.');

                //find pool
                //close tab
            } else {
                console.log("The 'Show all' button was not found within the targeted section.");
            }
        } catch (error) {
            console.log('Amenities section not found.');
        }

        await placeDetailsPage.closeCurrentTab(originalWindow);

    } catch (error) {
        console.error(`Error processing property`, error);
        await placeDetailsPage.closeCurrentTab(originalWindow);
    }
});

When('I hover over the first property from the search results page', async function () {
    // Wait for the property cards to be present
    const propertyCardLocator = By.css('[data-testid="card-container"]');
    await driver.wait(until.elementsLocated(propertyCardLocator), 20000);

    // Get the first property card
    const propertyCard = await driver.findElement(propertyCardLocator);

    // Step 1: Extract the title and price from the property card
    const propertyTitle = await driver.findElement(By.css('[data-testid="listing-card-title"]')).getText();
    const propertyPriceElement = await driver.findElement(By.xpath('//div[@data-testid="price-availability-row"]/div[2]//span[2]'));
    let propertyPrice = await propertyPriceElement.getText();

    // Normalize the price by removing spaces, &nbsp;, and other non-numeric parts
    propertyPrice = propertyPrice.replace(/\s/g, '').replace(/&nbsp;/g, '').trim();
    console.log('Normalized propertyPrice:', propertyPrice);

    // Save the extracted details to `this`
    this.propertyTitle = propertyTitle;
    this.propertyPrice = propertyPrice;

    // Log for debugging
    console.log('Extracted title:', this.propertyTitle);
    console.log('Extracted price:', this.propertyPrice);

    // Step 2: Find the map pin with the same price
    const mapPins = await driver.findElements(By.css('button[data-testid="map/markers/BasePillMarker"]'));
    let matchingPin = null;

    for (const pin of mapPins) {
        // Extract the full text from the pin, which contains both the title and price
        const pinText = await pin.getText();
        console.log('Pin text is:', pinText);

        // Use a regular expression to extract only the price from the pin text
        const priceMatch = pinText.match(/(\d+[,.\d]*)\s*lei/);
        const pinPrice = priceMatch ? priceMatch[0].replace(/\s/g, '').trim() : null;

        // Log the extracted price for debugging
        if (pinPrice) {
            console.log('Extracted pin price:', pinPrice);

            // Check if both the property title and price match the pin
            if (pinText.includes(propertyTitle) && pinPrice === propertyPrice) {
                console.log(`Matching pin found: Title: ${propertyTitle}, Price: ${pinPrice}`);
                matchingPin = pin;
                break;
            }
        } else {
            console.log('No price found in pin text.');
        }
    }

    // Step 3: Assert that a matching map pin was found
    if (matchingPin) {
        this.matchingPin = matchingPin;
        console.log('Found the matching map pin with price:', propertyPrice);

        // Step 4: Target the correct inner div within the pin
        const pinInnerDiv = await matchingPin.findElement(By.css('div[style*="background-color"]'));

        // Capture the entire style attribute before hovering the property card
        const beforeHoverStyle = await pinInnerDiv.getAttribute('style');
        console.log('Style attribute before hover:', beforeHoverStyle);

        // Extract the background-color value from the style attribute
        const beforeHoverColorMatch = beforeHoverStyle.match(/background-color:\s*([^;]+)/);
        let backgroundColorBeforeHover = beforeHoverColorMatch ? beforeHoverColorMatch[1].trim() : null;
        console.log('Background color before hover:', backgroundColorBeforeHover);

        // Hover over the property card (this should change the pin's color)
        await driver.actions().move({origin: propertyCard}).perform();

        // Wait for the hover effect to take place
        await driver.sleep(500); // Allow 500ms for transition effects to complete

        // Step 5: Capture the entire style attribute after hovering the property card
        const afterHoverStyle = await pinInnerDiv.getAttribute('style');
        console.log('Style attribute after hover:', afterHoverStyle);

        // Extract the background-color value from the style attribute after hover
        const afterHoverColorMatch = afterHoverStyle.match(/background-color:\s*([^;]+)/);
        let backgroundColorAfterHover = afterHoverColorMatch ? afterHoverColorMatch[1].trim() : null;
        console.log('Background color after hover:', backgroundColorAfterHover);

        // Step 6: Compare the color values
        expect(backgroundColorBeforeHover).to.not.equal(backgroundColorAfterHover, 'Pin color did not change on hover.');
        expect(backgroundColorAfterHover).to.equal('var(--linaria-theme_palette-hof)', 'Pin color did not match the expected color.');
    } else {
        throw new Error('No matching map pin found for the property price');
    }
});

When('I clear additional filters', {timeout: 120000}, async function () {
    console.log('Clearing additional filters...');

    // Open the filters modal
    await homePage.openFilters();

    // Clear all filters
    await homePage.clickClearAll(); // This will now call the newly created clickClearAll method

    // Click "Show Stays" to apply the cleared filters (optional depending on UI behavior)
    await homePage.clickShowStays();

    console.log('Filters cleared.');
});

Then('I click the property on the map and verify the details', async function () {
    if (this.matchingPin) {
        console.log('Clicking on the matching pin...');
        await this.matchingPin.click();
        console.log('Pin clicked.');

        // Wait for the property card (popup) to appear on the map
        const mapPopupLocator = By.css('[data-testid="card-container"]');
        await driver.wait(until.elementLocated(mapPopupLocator), 10000);
        const mapPopup = await driver.findElement(mapPopupLocator);
        console.log('Property popup is visible.');

        // Extract the title from the popup
        const popupTitleLocator = By.css('[data-testid="listing-card-title"]');
        const popupTitle = await mapPopup.findElement(popupTitleLocator).getText();
        console.log('Popup title:', popupTitle);

        // Extract the price from the popup
        const popupPriceLocator = By.xpath('//div[@data-testid="price-availability-row"]/div[2]//span[2]');
        let popupPrice = await mapPopup.findElement(popupPriceLocator).getText();
        popupPrice = popupPrice.replace(/\s/g, '').replace(/&nbsp;/g, '').trim();  // Normalize the price
        console.log('Popup price:', popupPrice);

        // Compare the popup details with the saved property details
        expect(popupTitle).to.equal(this.propertyTitle, 'Popup title does not match the property title from search results.');
        expect(popupPrice).to.equal(this.propertyPrice, 'Popup price does not match the property price from search results.');

        console.log('Verified that the popup details match the search result.');
    } else {
        throw new Error('No matching map pin was found to click.');
    }
});








// src/step_definitions/airbnb_search.steps.ts

import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Given, When, Then, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { expect } from 'chai';
import { HomePage } from '../pages/homePage';

let driver: WebDriver;
let homePage: HomePage;

BeforeAll(async () => {
    driver = await new Builder()
        // .usingServer('http://localhost:4444/wd/hub') // Comment out or remove this line
        .forBrowser('chrome')
        .build();

    await driver.manage().window().maximize();

    // Set timeouts
    await driver.manage().setTimeouts({ pageLoad: 60000 });

    homePage = new HomePage(driver);
});


AfterAll(async () => {
    if (driver) {
        await driver.quit();
    }
});

Given('I open Airbnb homepage', async () => {
    await driver.get('https://www.airbnb.com/');

    console.log('Current URL:', await driver.getCurrentUrl());
    console.log('Page Title:', await driver.getTitle());

    // Add a short delay to ensure the page has loaded
    await driver.sleep(2000); // Wait for 2 seconds

    // driver.manage().window().maximize();

    // Now locate and wait for the location input field
    const locationInputLocator = By.css('input[data-testid="structured-search-input-field-query"]');
    const locationInput = await driver.wait(until.elementLocated(locationInputLocator), 20000);
    await driver.wait(until.elementIsVisible(locationInput), 20000);

    console.log('Current URL:', await driver.getCurrentUrl());
    console.log('Page Title:', await driver.getTitle());
});

When( 'I search for properties in {string} with the following details:', { timeout: 60 * 1000 }, async function (location: string, dataTable) {
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
    console.log("111111");
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

Then('I should see properties accommodating at least {int} guests',  { timeout: 120000 }, async function (minGuests: number) {
    // Wait for at least 2 property cards to load
    await driver.wait(async function() {
        const elements = await driver.findElements(By.css('[data-testid="card-container"]'));
        return elements.length >= 2;  // Adjust if needed
    }, 20000);

    // Find all property cards
    const propertyCards = await driver.findElements(By.css('[data-testid="card-container"]'));
    console.log(`Found ${propertyCards.length} property cards.`);

    // Limit the number of properties to check
    const maxPropertiesToCheck = 18; // Adjust as needed
    const propertiesToCheck = propertyCards.slice(0, maxPropertiesToCheck);

    // Collect property URLs
    const propertyUrls = [];
    for (const card of propertiesToCheck) {
        try {
            const linkElement = await card.findElement(By.css('a'));
            const href = await linkElement.getAttribute('href');
            //console.log(`Raw href: ${href}`);

            let propertyUrl = href;
            if (!href.startsWith('http')) {
                // If href is a relative path, prepend the domain
                propertyUrl = `https://www.airbnb.com${href}`;
            }

            console.log(`Collected property URL: ${propertyUrl}`);
            propertyUrls.push(propertyUrl);
        } catch (error) {
            console.log('Unable to retrieve property URL.', error);
            continue;
        }
    }

    // Open each property in a new tab and check capacity
    const originalWindow = await driver.getWindowHandle();

    for (let i = 0; i < propertyUrls.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 250));  // Wait 2 seconds between requests
        const url = propertyUrls[i];
        console.log("---");
        console.log(`Processing property ${i + 1}: ${url}`);

        try {
            // Open a new tab
            await driver.switchTo().newWindow('tab');
            await driver.get(url);

            console.log("waiting for body to load");
            // Wait for the property details page to load
            await driver.wait(until.elementLocated(By.css('body')), 10000);
            console.log("body loaded");
            // Wait for the modal to appear (if present)
            try {
                // Wait for the modal to be present (adjust the timeout as needed)
                const modal = await driver.wait(until.elementLocated(By.css('[role="dialog"][aria-label="Translation on"]')), 5000);

                // If the modal is found, attempt to close it
                if (modal) {
                    console.log("Modal is displayed. Attempting to close it...");

                    // Find and click the close button
                    const closeButton = await modal.findElement(By.css('button[aria-label="Close"]'));
                    await closeButton.click();

                    console.log("Modal closed successfully.");
                }
            } catch (error) {
                // If the modal isn't found within the timeout, handle it gracefully
                console.log("No modal displayed or unable to locate the modal. Continuing with the test...");
            }

            // Locate the container with data-section-id="OVERVIEW_DEFAULT_V2"
            await driver.wait(until.elementLocated(By.css('[data-section-id="OVERVIEW_DEFAULT_V2"]')), 10000);
            let overviewSection;
            try {
                overviewSection = await driver.findElement(By.css('[data-section-id="OVERVIEW_DEFAULT_V2"]'));
            } catch (error) {
                console.log('Overview section not found.');
                continue; // Skip to the next property
            }

            // Locate the <li> element inside the overview section that contains guest information
            let capacityText = '';
            try {
                const guestInfoElement = await overviewSection.findElement(By.xpath(".//li[contains(text(), 'guests')]"));
                capacityText = await guestInfoElement.getText();
            } catch (error) {
                console.log('Guest information not found in this property.');
                continue; // Skip to the next property
            }

            console.log('Capacity text:', capacityText);

            // Parse the number of guests from the capacity text
            const guestsMatch = capacityText.match(/(\d+)\s+guests?/i);
            if (guestsMatch) {
                const maxGuests = parseInt(guestsMatch[1], 10);
                console.log(`Property accommodates ${maxGuests} guests.`);

                // Verify that the property accommodates at least minGuests
                if (maxGuests >= minGuests) {
                    console.log(`Property meets the requirement of at least ${minGuests} guests.`);
                } else {
                    console.log(`Property does not meet the requirement of at least ${minGuests} guests.`);
                }
            } else {
                console.log('Unable to determine guest capacity for this property.');
            }

            // Close the current tab and switch back to the original tab
            await driver.close();
            await driver.switchTo().window(originalWindow);

        } catch (error) {
            console.error(`Error processing property ${i + 1}:`, error);
            await driver.close();  // Close tab if an error occurs
            await driver.switchTo().window(originalWindow);
            continue;
        }
    }
});

When('I apply additional filters:',  { timeout: 120000 }, async function (dataTable) {
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

Then('I should see properties with at least {int} bedrooms and a pool',  { timeout: 120000 }, async function (minBedrooms: number) {
    // Wait for the property cards to load
    await driver.wait(until.elementsLocated(By.css('div[itemprop="itemListElement"]')), 20000);

    // Find all property cards
    const propertyCards = await driver.findElements(By.css('div[itemprop="itemListElement"]'));
    console.log(`Found ${propertyCards.length} property cards.`);

    // Limit the number of properties to check
    const maxPropertiesToCheck = 5; // Adjust as needed
    const propertiesToCheck = propertyCards.slice(0, maxPropertiesToCheck);

    // Collect property URLs
    const propertyUrls = [];
    for (const card of propertiesToCheck) {
        try {
            const linkElement = await card.findElement(By.css('a'));
            const href = await linkElement.getAttribute('href');
            let propertyUrl = href.startsWith('http') ? href : `https://www.airbnb.com${href}`;
            propertyUrls.push(propertyUrl);
        } catch (error) {
            console.log('Unable to retrieve property URL.');
            continue;
        }
    }

    // Iterate over each property URL
    for (let i = 0; i < propertyUrls.length; i++) {
        const url = propertyUrls[i];
        console.log(`Processing property ${i + 1}: ${url}`);

        try {
            // Navigate to the property details page
            await driver.get(url);

            // Wait for the property details page to load
            await driver.wait(until.elementLocated(By.css('body')), 10000);

            // Verify the number of bedrooms
            let bedroomsText = '';
            try {
                const bedroomsElement = await driver.findElement(By.xpath("//*[contains(text(), 'bedroom')]"));
                bedroomsText = await bedroomsElement.getText();
            } catch (error) {
                console.log('Bedrooms information not found in this property.');
                continue; // Skip to the next property
            }

            console.log('Bedrooms text:', bedroomsText);

            // Parse the number of bedrooms
            const bedroomsMatch = bedroomsText.match(/(\d+)\s+bedrooms?/i);
            let bedroomsCount = 0;
            if (bedroomsMatch) {
                bedroomsCount = parseInt(bedroomsMatch[1], 10);
            } else {
                // Handle singular 'bedroom'
                if (/1\s+bedroom/i.test(bedroomsText)) {
                    bedroomsCount = 1;
                } else {
                    console.log('Unable to determine number of bedrooms for this property.');
                    continue;
                }
            }

            console.log(`Property has ${bedroomsCount} bedrooms.`);

            // Verify that the property has at least minBedrooms
            expect(bedroomsCount).to.be.at.least(minBedrooms);

            // Verify that the property includes a pool
            let hasPool = false;
            try {
                const poolElement = await driver.findElement(By.xpath("//*[contains(text(), 'Pool')]"));
                hasPool = true;
            } catch (error) {
                hasPool = false;
            }

            console.log(`Property has pool: ${hasPool}`);
            expect(hasPool).to.be.true;

        } catch (error) {
            console.error(`Error processing property ${i + 1}:`, error);
            continue; // Proceed to the next property
        }
    }
});

Then('all results on the first page have at least {int} bedrooms', { timeout: 120000 }, async function (minBedrooms: number) {
    console.log(`\nVerifying that all properties on the first page have at least ${minBedrooms} bedrooms...`);
    await driver.wait(async function() {
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
        // Re-fetch the property card to avoid stale element reference
        const propertyCardsUpdated = await driver.findElements(By.css('[data-testid="card-container"]'));
        const card = propertyCardsUpdated[i];
        console.log(`\nProcessing property ${i + 1} of ${propertyCards.length}...`);

        try {
            // Locate the subtitle elements within the card
            const subtitleLocator = By.css('[data-testid="listing-card-subtitle"]');
            const subtitles = await card.findElements(subtitleLocator);

            if (subtitles.length < 2) {
                throw new Error(`Property ${i + 1} does not have enough subtitle elements to determine bedrooms.`);
            }

            // Assuming the second subtitle contains the bedroom information
            const bedroomsSubtitle = subtitles[1];
            const bedroomsText = await bedroomsSubtitle.getText();
            console.log(`Bedrooms text: "${bedroomsText}"`);

            // Extract the number of bedrooms using regex
            const bedroomsMatch = bedroomsText.match(/(\d+)\s+bedrooms/i);
            let bedroomsCount = 0;

            if (bedroomsMatch) {
                bedroomsCount = parseInt(bedroomsMatch[1], 10);
                console.log(`Property ${i + 1} has ${bedroomsCount} bedrooms.`);

                // Assert that the property meets the minimum bedroom requirement
                expect(bedroomsCount, `Property ${i + 1} has fewer bedrooms than the required ${minBedrooms}.`).to.be.at.least(minBedrooms);
            } else if (/1\s+bedroom/i.test(bedroomsText)) {
                bedroomsCount = 1;
                console.log(`Property ${i + 1} has ${bedroomsCount} bedrooms.`);

                // Assert that the property meets the minimum bedroom requirement
                expect(bedroomsCount, `Property ${i + 1} has fewer bedrooms than the required ${minBedrooms}.`).to.be.at.least(minBedrooms);
            } else {
                console.log(`Unable to determine the number of bedrooms for property ${i + 1}.`);
                //
                //
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
                        console.log(`Collected property URL: ${propertyUrl}`);
                    } catch (error) {
                        console.log('Unable to retrieve property URL.', error);
                        continue;
                    }
                    propertyUrl = encodeURI(propertyUrl);
                    // Open a new tab
                    await driver.switchTo().newWindow('tab');
                    await driver.sleep(1000);
                    await driver.get(propertyUrl);

                    console.log("waiting for body to load");
                    // Wait for the property details page to load
                    await driver.wait(until.elementLocated(By.css('body')), 10000);
                    console.log("body loaded");
                    // Wait for the modal to appear (if present)
                    try {
                        // Wait for the modal to be present (adjust the timeout as needed)
                        const modal = await driver.wait(until.elementLocated(By.css('[role="dialog"][aria-label="Translation on"]')), 5000);

                        // If the modal is found, attempt to close it
                        if (modal) {
                            console.log("Modal is displayed. Attempting to close it...");

                            // Find and click the close button
                            const closeButton = await modal.findElement(By.css('button[aria-label="Close"]'));
                            await closeButton.click();

                            console.log("Modal closed successfully.");
                        }
                    } catch (error) {
                        // If the modal isn't found within the timeout, handle it gracefully
                        console.log("No modal displayed or unable to locate the modal. Continuing with the test...");
                    }

                    // Locate the container with data-section-id="OVERVIEW_DEFAULT_V2"
                    await driver.wait(until.elementLocated(By.css('[data-section-id="OVERVIEW_DEFAULT_V2"]')), 10000);
                    let overviewSection;
                    try {
                        overviewSection = await driver.findElement(By.css('[data-section-id="OVERVIEW_DEFAULT_V2"]'));
                    } catch (error) {
                        console.log('Overview section not found.');
                        continue; // Skip to the next property
                    }
                    // Extract bedroom information
                    let bedroomText = '';
                    try {
                        const bedroomElement = await overviewSection.findElement(By.xpath(".//li[contains(text(), 'bedroom')]"));
                        bedroomText = await bedroomElement.getText();

                        console.log('Numatul de dormiatoare este', bedroomText);
                    } catch (error) {
                        console.log(error);
                        console.log('Bedroom information not found in this property.');
                        // Navigate back to the search results page
                        await driver.navigate().back();
                        await driver.wait(until.urlContains('/s/'), 10000);
                        continue; // Skip to the next property
                    }

                    console.log('Bedrooms text:', bedroomText);

                    // Parse the number of bedrooms from the capacity text
                    const bedroomsMatch = bedroomText.match(/(\d+)\s+bedrooms?/i);
                    if (bedroomsMatch) {
                        const maxBedrooms = parseInt(bedroomsMatch[1], 10);
                        console.log(`Property accommodates ${maxBedrooms} bedrooms.`);

                        // Verify that the property accommodates at least minBedrooms
                        expect(maxBedrooms).to.be.at.least(minBedrooms);
                    } else {
                        console.log('Unable to determine bedroom capacity for this property.');
                    }

                    // Close the current tab and switch back to the original tab
                    await driver.close();
                    await driver.switchTo().window(originalWindow);

                } catch (error) {
                    console.error(`Error processing property ${i + 1}:`, error);
                    // Close the current tab and switch back to the original tab
                    await driver.close();
                    await driver.switchTo().window(originalWindow);
                    continue; // Proceed to the next property
                }
            }
        } catch (error) {
            console.error(`Error processing property ${i + 1}: ${error}`);
            throw error;
        }
    }

    console.log(`\nAll properties on the first page have at least ${minBedrooms} bedrooms.`);
});

Then(/^first result has pool amenity$/, { timeout: 120000 }, async function () {
    console.log(`\nVerifying that the first property on the page has pool amenity...`);
    await driver.wait(async function() {
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
            console.log(`Collected property URL: ${propertyUrl}`);
        } catch (error) {
            console.log('Unable to retrieve property URL.', error);
        }
        propertyUrl = encodeURI(propertyUrl);
        // Open a new tab
        await driver.switchTo().newWindow('tab');
        await driver.sleep(1000);
        await driver.get(propertyUrl);

        console.log("waiting for body to load");
        // Wait for the property details page to load
        await driver.wait(until.elementLocated(By.css('body')), 10000);
        console.log("body loaded");
        // Wait for the modal to appear (if present)
        try {
            // Wait for the modal to be present (adjust the timeout as needed)
            const modal = await driver.wait(until.elementLocated(By.css('[role="dialog"][aria-label="Translation on"]')), 5000);

            // If the modal is found, attempt to close it
            if (modal) {
                console.log("Modal is displayed. Attempting to close it...");

                // Find and click the close button
                const closeButton = await modal.findElement(By.css('button[aria-label="Close"]'));
                await closeButton.click();

                console.log("Modal closed successfully.");
            }
        } catch (error) {
            // If the modal isn't found within the timeout, handle it gracefully
            console.log("No modal displayed or unable to locate the modal. Continuing with the test...");
        }

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

        // Close the current tab and switch back to the original tab
        await driver.close();
        await driver.switchTo().window(originalWindow);

    } catch (error) {
        console.error(`Error processing property`, error);
        // Close the current tab and switch back to the original tab
        await driver.close();
        await driver.switchTo().window(originalWindow);
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

    // Log for debugging
    console.log('Extracted title:', propertyTitle);
    console.log('Extracted price:', propertyPrice);

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
        await driver.actions().move({ origin: propertyCard }).perform();

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

Then('property is displayed on the map and the color of the pin changes', { timeout: 10000 }, async function () {
    const mapLocator = By.css('div[data-testid="map"]');
    await driver.wait(until.elementLocated(mapLocator), 20000); // Wait for the map to be visible

    const mapPinLocator = By.css('div[data-testid="map-pin"]');
    const mapPin = await driver.wait(until.elementLocated(mapPinLocator), 10000); // Wait for the pin

    const originalColor = await mapPin.getCssValue('background-color');
    console.log(`Original pin color: ${originalColor}`);

    // Assuming some hover or interaction changes the pin color
    await driver.actions().move({origin: mapPin}).perform();
    const changedColor = await mapPin.getCssValue('background-color');
    console.log(`Pin color after hover: ${changedColor}`);

    expect(changedColor).to.not.equal(originalColor, 'Pin color did not change on hover.');
});

When('I click the property on the map', async function () {
    const mapPinLocator = By.css('div[data-testid="map-pin"]');
    const mapPin = await driver.findElement(mapPinLocator);

    await mapPin.click();
    console.log('Clicked on the property pin on the map.');
});

Then('the details shown on the map popup should be the same as the ones from the search results', async function () {
    // Retrieve the search results details
    const propertyTitleLocator = By.css('[data-testid="listing-title"]');
    const searchResultsTitle = await driver.findElement(propertyTitleLocator).getText();

    console.log('Search results property title:', searchResultsTitle);

    // Get the map popup title
    const popupTitleLocator = By.css('[data-testid="map-popup-title"]');
    const popupTitle = await driver.findElement(popupTitleLocator).getText();

    console.log('Map popup property title:', popupTitle);

    // Compare the titles
    expect(popupTitle).to.equal(searchResultsTitle, 'The details in the map popup do not match the search results.');
});

When('I clear additional filters', { timeout: 120000 }, async function () {
    console.log('Clearing additional filters...');

    // Open the filters modal
    await homePage.openFilters();

    // Clear all filters
    await homePage.clickClearAll(); // This will now call the newly created clickClearAll method

    // Click "Show Stays" to apply the cleared filters (optional depending on UI behavior)
    await homePage.clickShowStays();

    console.log('Filters cleared.');
});




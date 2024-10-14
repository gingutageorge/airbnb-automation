import {By, WebDriver, until, Key, WebElement} from 'selenium-webdriver';

export class HomePage {
    constructor(private driver: WebDriver) {}

    async enterLocation(location: string) {
        // Locate the location input field using data-testid
        console.log('Locating the location input field...');
        const locationInput = await this.driver.findElement(
            By.css('input[data-testid="structured-search-input-field-query"]')
        );
        await this.driver.wait(until.elementIsVisible(locationInput), 10000);
        console.log('Location input field is visible.');

        await locationInput.clear(); // Clear any existing text
        console.log('Cleared the location input field.');

        await locationInput.sendKeys(location);
        console.log(`Entered location: ${location}`);

        await locationInput.sendKeys(Key.RETURN);
        console.log('Pressed Enter after entering the location.');

        // Optional: Wait for the location to be filled in the input field
        const filledLocation = await locationInput.getAttribute('value');
        console.log(`Filled location in input field: ${filledLocation}`);
    }

    async closeOverlays() {
        try {
            // Example: Close cookie consent banner
            const acceptCookiesButton = await this.driver.findElement(
                By.css('button[data-testid="accept-cookie-banner"]')
            );
            await acceptCookiesButton.click();
            console.log('Current URL:', await this.driver.getCurrentUrl());
            console.log('Page Title:', await this.driver.getTitle());

        } catch (error) {
            // If the element is not found, proceed without throwing an error
        }
    }

    async openFilters() {
        console.log('Identifying "Filters" button...');
        const filtersButtonLocator = By.css('[data-testid="category-bar-filter-button"]');
        await this.driver.wait(until.elementLocated(filtersButtonLocator), 10000);
        const filtersButton = await this.driver.findElement(filtersButtonLocator);

        // Wait until the button is visible
        await this.driver.wait(until.elementIsVisible(filtersButton), 10000);
        console.log('"Filters" button is visible.');

        // Wait until the button is enabled and not busy
        await this.driver.wait(async () => {
            const ariaBusy = await filtersButton.getAttribute('aria-busy');
            const isDisabled = await filtersButton.getAttribute('disabled');
            return (ariaBusy === null || ariaBusy === 'false') && !isDisabled;
        }, 10000, '"Filters" button is still busy or disabled.');
        console.log('"Filters" button is enabled and not busy.');

        // Retrieve outerHTML using JavaScript for debugging
        const outerHtml = await this.driver.executeScript("return arguments[0].outerHTML;", filtersButton);
        console.log('Filters Button OuterHTML:', outerHtml);

        console.log('Clicking on "Filters" button...');
        await filtersButton.click();
        console.log('"Filters" button clicked.');

        // Wait for the modal to open
        const modalLocator = By.css('[data-testid="modal-container"]');
        await this.driver.wait(until.elementLocated(modalLocator), 10000);
        const modalElement = await this.driver.findElement(modalLocator);
        await this.driver.wait(until.elementIsVisible(modalElement), 10000);
        console.log('Filters modal opened.');
    }

    async setBedrooms(bedrooms: number) {
        console.log(`Setting number of bedrooms to ${bedrooms}...`);

        const increaseBedroomsButtonLocator = By.css('[data-testid="stepper-filter-item-min_bedrooms-stepper-increase-button"]');
        await this.driver.wait(until.elementLocated(increaseBedroomsButtonLocator), 10000);
        const increaseButton = await this.driver.findElement(increaseBedroomsButtonLocator);

        let currentValue = 0;
        // Increase the number of bedrooms to the desired amount
        while (currentValue < bedrooms) {
            await increaseButton.click();
            await this.driver.sleep(500); // Wait for the count to update
            currentValue++;
            console.log(`Increased bedrooms to ${currentValue}`);
        }
    }

    async selectAmenities(amenities: string[]) {
        // Wait until the section with the specific aria-labelledby is present
        const sectionSelector = '[aria-labelledby="filter-section-heading-id-FILTER_SECTION_CONTAINER:MORE_FILTERS_AMENITIES_WITH_SUBCATEGORIES"]';
        await this.driver.wait(
            until.elementLocated(By.css(sectionSelector)),
            10000,
            "The target section did not load within 10 seconds."
        );
        // Locate the section element
        const section = await this.driver.findElement(By.css(sectionSelector));

        // **Find All Buttons Within the Section**
        const buttons = await section.findElements(By.css('button'));

        // **Iterate Through Buttons to Find "Show more"**
        let showMoreButton = null;
        for (let button of buttons) {
            try {
                // Retrieve the text content of the button
                let buttonText = await button.getText();
                if (buttonText.trim().toLowerCase() === 'show more') {
                    showMoreButton = button;
                    break;
                }
            } catch (err) {
                // If unable to get text, continue to the next button
                continue;
            }
        }

        // **Check if "Show more" Button Was Found**
        if (showMoreButton) {
            // Ensure the button is visible and enabled before clicking
            await this.driver.wait(
                until.elementIsVisible(showMoreButton),
                10000,
                "The 'Show more' button is not visible."
            );

            await this.driver.wait(
                until.elementIsEnabled(showMoreButton),
                10000,
                "The 'Show more' button is not enabled."
            );

            // Click the "Show more" button
            await showMoreButton.click();
            console.log("Clicked the 'Show more' button successfully.");
        } else {
            console.log("The 'Show more' button was not found within the targeted section.");
        }

        // **Find All Buttons Within the Section**
        const buttonsAll = await section.findElements(By.css('button'));

        // **Iterate Through Buttons to Find "Show more"**
        let poolButton = null;
        for (let button of buttonsAll) {
            try {
                // Retrieve the text content of the button
                let buttonText = await button.getText();
                if (buttonText.trim().toLowerCase() === 'pool') {
                    poolButton = button;
                    break;
                }
            } catch (err) {
                // If unable to get text, continue to the next button
                continue;
            }
        }

        // **Check if "Show more" Button Was Found**
        if (poolButton) {
            // Ensure the button is visible and enabled before clicking
            await this.driver.wait(
                until.elementIsVisible(poolButton),
                10000,
                "The 'poolButton' button is not visible."
            );

            await this.driver.wait(
                until.elementIsEnabled(poolButton),
                10000,
                "The 'poolButton' button is not enabled."
            );

            // Click the "pool" button
            await poolButton.click();
            console.log("Clicked the 'poolButton' button successfully.");
        } else {
            console.log("The 'pool' button was not found within the targeted section.");
        }

        // Optional: Wait for a few seconds to observe the result
        await this.driver.sleep(5000);
    }

    async clickShowStays() {
        console.log('Clicking "Show stays" button...');
// Wait for the footer element to appear (this assumes only one footer element exists)
        const footer = await this.driver.findElement(By.tagName('footer'));

        const showLinkLocator = By.xpath("//footer//a[contains(text(), 'Show')]");

        // Wait for the element to be located and visible
        await this.driver.wait(until.elementLocated(showLinkLocator), 10000);
        await this.driver.wait(until.elementIsVisible(this.driver.findElement(showLinkLocator)), 10000);

        const showPlacesButton = await footer.findElement(showLinkLocator);

// Click the button
        await showPlacesButton.click();
        console.log('Clicked the "Show places" button.');

    }

    private async selectDate(dateStr: string) {
        // Find the date element using data-testid
        const dateElementLocator = By.css(`[data-testid="${dateStr}"][data-is-day-blocked="false"]`);
        // const dateElementLocator = By.css(`td[data-testid="${dateStr}"]`);
        const dateElement = await this.driver.wait(until.elementLocated(dateElementLocator), 10000);
        await this.driver.wait(until.elementIsVisible(dateElement), 10000);

        // Click the date
        await dateElement.click();
    }

    async selectDates(checkInDaysAhead: number, checkOutDaysAhead: number) {
        console.log('Closing overlays if any...');
        await this.closeOverlays();

        console.log('Clicking on the check-in button to open the date picker...');
        const checkInButton = await this.driver.findElement(
            By.css('[data-testid="structured-search-input-field-split-dates-0"]')
        );
        await this.driver.wait(until.elementIsVisible(checkInButton), 10000);
        await checkInButton.click();
        console.log('Check-in button clicked.');

        // Wait for the date picker to be visible
        console.log('Waiting for the date picker to be visible...');
        const datePickerLocator = By.css('[data-testid="structured-search-input-field-dates-panel"]');
        await this.driver.wait(until.elementLocated(datePickerLocator), 10000);
        const datePicker = await this.driver.findElement(datePickerLocator);
        await this.driver.wait(until.elementIsVisible(datePicker), 10000);
        console.log('Date picker is visible.');

        // Calculate the dates
        const checkInDate = this.calculateFutureDate(checkInDaysAhead);
        const checkOutDate = this.calculateFutureDate(checkOutDaysAhead);
        console.log(`Selecting check-in date: ${checkInDate}`);
        console.log(`Selecting check-out date: ${checkOutDate}`);

        // Select the check-in date
        await this.selectDate(checkInDate);

        // Select the check-out date
        await this.selectDate(checkOutDate);

        console.log('Dates selected.');
    }

    private calculateFutureDate(daysAhead: number): string {
        const date = new Date();
        date.setDate(date.getDate() + daysAhead);
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }

    async selectGuests(adults: number, children: number) {
        console.log('Opening the guests selector...');
        // Open the guests selector
        const guestsButton = await this.driver.findElement(
            By.css('[data-testid="structured-search-input-field-guests-button"]')
        );
        await guestsButton.click();

        // Increase adults
        const increaseAdultsButton = await this.driver.findElement(
            By.css('[data-testid="stepper-adults-increase-button"]')
        );
        for (let i = 0; i < adults; i++) {
            await increaseAdultsButton.click();
            await this.driver.sleep(500); // Wait for the count to update
            console.log(`Increased adults count to ${i + 1}`);
        }

        // Increase children
        console.log(`Increasing children by ${children}...`);
        const increaseChildrenButton = await this.driver.findElement(
            By.css('[data-testid="stepper-children-increase-button"]')
        );
        for (let i = 0; i < children; i++) {
            await increaseChildrenButton.click();
            await this.driver.sleep(500); // Wait for the count to update
            console.log('Guests selection completed.');
        }

    }

    async clickSearch() {
        console.log('Clicking the search button...');
        const searchButton = await this.driver.findElement(
            By.css('[data-testid="structured-search-input-search-button"]')
        );
        await searchButton.click();
        console.log('Search button clicked.');
    }

    async clickClearAll() {
        console.log('Clicking "Clear all" button...');

        // Wait for the footer element where CLear all buton is to appear
        const footer = await this.driver.findElement(By.tagName('footer'));

        // Find the anchor or button that contains "Clear all" text inside the footer
        const clearAllButton = await footer.findElement(By.xpath("//button[contains(text(), 'Clear all')]"));

        // Click the "Clear all" button
        await clearAllButton.click();
        console.log('Clicked the "Clear all" button.');
    }
}





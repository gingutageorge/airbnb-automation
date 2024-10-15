import { BasePage } from './basePage';
import {By, WebDriver, until, Key, WebElement} from 'selenium-webdriver';

export class PlaceDetailsPage extends BasePage {
    constructor(driver: WebDriver) {
        super(driver);
    }

    async closeTranslationOverlayIfNeeded() {
        try {
            const modal = await this.driver.wait(until.elementLocated(By.css('[role="dialog"][aria-label="Translation on"]')), 5000);
            if (modal) {
                console.log("Translation modal is displayed. Attempting to close it...");
                const closeButton = await modal.findElement(By.css('button[aria-label="Close"]'));
                await closeButton.click();

                console.log("Translation modal closed successfully.");
            }
        } catch (error) {
            console.log("No translation modal displayed or unable to locate the modal. Continuing with the test...");
        }
    }

    async getOverviewSection() {
        await this.driver.wait(until.elementLocated(By.css('[data-section-id="OVERVIEW_DEFAULT_V2"]')), 10000);
        try {
            return await this.driver.findElement(By.css('[data-section-id="OVERVIEW_DEFAULT_V2"]'));
        } catch (error) {
            console.log('Overview section not found.');
            throw error;
        }
    }

    async getGuestCapacityText(overviewSection: WebElement) {
        try {
            const guestInfoElement = await overviewSection.findElement(By.xpath(".//li[contains(text(), 'guests')]"));
            const guestText = await guestInfoElement.getText();
            return guestText;
        } catch (error) {
            throw new Error('Guest information not found for this property');
        }
    }

    parseMaxGuests(capacityText: string) {
        const guestsMatch = capacityText.match(/(\d+)\s+guests?/i);
        return guestsMatch ? parseInt(guestsMatch[1], 10) : null;
    }

    verifyMinGuests(maxGuests: number, minGuests: number) {
        if (maxGuests >= minGuests) {
            console.log(`Property meets the requirement of at least ${minGuests} guests.`);
        } else {
            console.log(`Property does not meet the requirement of at least ${minGuests} guests.`);
        }
    }

    async getBedroomInformation(overviewSection: WebElement) {
        try {
            const bedroomElement = await overviewSection.findElement(By.xpath(".//li[contains(text(), 'bedroom')]"));
            const bedroomText = await bedroomElement.getText();
            return bedroomText;
        } catch (error) {
            throw new Error('Bedroom information not found for this property');
        }
    }

    parseMaxBedrooms(bedroomText: string) {
        const bedroomsMatch = bedroomText.match(/(\d+)\s+bedrooms?/i);
        return bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : null;
    }

    verifyMinBedrooms(maxBedrooms: number, minBedrooms: number) {
        if (maxBedrooms >= minBedrooms) {
            console.log(`Property meets the requirement of at least ${minBedrooms} bedrooms.`);
        } else {
            throw new Error(`Property does not meet the minimum bedroom requirement of ${minBedrooms}`);
        }
    }

    async extractBedroomsFromDetailsPage(card: WebElement, originalWindow: string) {
        let propertyUrl = '';
        try {
            const linkElement = await card.findElement(By.css('a'));
            const href = await linkElement.getAttribute('href');

            propertyUrl = href.startsWith('http') ? href : `https://www.airbnb.com${href}`;
            propertyUrl = encodeURI(propertyUrl);

            await this.openNewTabAndNavigate(propertyUrl);
            await this.waitForBodyToLoad();
            await this.closeTranslationOverlayIfNeeded();

            const overviewSection = await this.getOverviewSection();
            const bedroomText = await this.getBedroomInformation(overviewSection);
            const maxBedrooms = this.parseMaxBedrooms(bedroomText);

            return maxBedrooms;
        } catch (error) {
            console.error('Error extracting bedrooms from details page:', error);
            return null;
        } finally {
            await this.closeCurrentTab(originalWindow);
        }
    }
}
import {By, WebDriver, until, Key, WebElement} from 'selenium-webdriver';

export class BasePage {
    protected driver: WebDriver;

    constructor(driver: WebDriver) {
        this.driver = driver;
    }

    async openNewTabAndNavigate(url: string) {
        await this.driver.switchTo().newWindow('tab');
        await this.driver.get(url);
    }

    async waitForBodyToLoad() {
        console.log("Waiting for body to load");
        await this.driver.wait(until.elementLocated(By.css('body')), 10000);
        console.log("Body loaded");
    }

    async closeCurrentTab(originalWindow: string) {
        await this.driver.close();
        await this.driver.switchTo().window(originalWindow);
    }
}
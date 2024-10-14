// cucumber.js

module.exports = {
    default: {
        require: ['src/step_definitions/**/*.ts'],
        requireModule: ['ts-node/register'],
        format: ['progress', 'json:reports/cucumber_report.json'],
        paths: ['src/features/**/*.feature'],
            }
};

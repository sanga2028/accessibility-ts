Feature: Accessibility Scan

Scenario: Scan multiple pages for accessibility
  Given I have the following URLs and optional selectors
    | https://dequeuniversity.com/demo/mars/ | |
    | https://www.youtube.com/               | |
    | https://lex.infosysapps.com/web/en/login | |
  When I run accessibility scan based on provided data
  Then I generate HTML, JSON, and XML reports for all scans

Scenario: Scan specific parts of multiple pages
  Given I have the following URLs and optional selectors
    | https://dequeuniversity.com/demo/mars/ | #menu-panel |
  When I run accessibility scan based on provided data
  Then I generate HTML, JSON, and XML reports for all scans
# griffinN6N9Chatbot Documentation

A repository of information regarding the chatbots for Griffin Media, News on 6, and News 9 websites.

Viewing this in VS Code should allow you to collapse each section as you wish for clarification and easy modification.

# News on 6

## Session (custom) Variables:

| Name                 | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| accountCurrPasswd    | Current password of the user.                                                    |
| accountDOB           | MMDDYYYY birthdate/id PIN of the user.                                           |
| accountEmail         | Email of the new user's account.                                                 |
| accountFirstName     | First name of the new user's account.                                            |
| accountLastName      | Last name of the new user's account.                                             |
| accountNewPasswd     | New password set by the user.                                                    |
| accountPhone         | Phone num of the new user's account (default is 0).                              |
| adCompany            | Company name of the advertising inquirer.                                        |
| adDescription        | Description of the service/goods provided by the advertising inquirer's company. |
| adPhone              | Contact phone number of the advertising inquirer.                                |
| feedbackCategory     | Category chosen by the user for their feedback.                                  |
| feedbackDescription  | Description of the user's feedback.                                              |
| technicalCategory    | Category chosen by the user for their technical issue.                           |
| technicalDate        | Date the technical issue occurs.                                                 |
| technicalDescription | Description of the technical issue.                                              |
| technicalLocation    | Device location/TV channel where the technical issue occurs.                     |
| technicalSubCategory | Subcategory of the technical issue, if applicable.                               |
| userEmail            | Contact email of the user.                                                       |
| userName             | Name of the user.                                                                |

## API Structure

https://hooks.zapier.com/hooks/catch/655388/

#### Endpoints

##### N6 - Technical Problems

- **URL**: `/2u3ynec`
- **Method**: `POST`
- **Description**: Zapier response for technical issues or content problem reporting.
- **Request Body**:
  - `now` (string, format: date-time): Timestamp of the session.
  - `technicalCategory` (string): Category key of the issue.
  - `technicalDate` (string): Date of the issue.
  - `technicalDescription` (string): Body of the problem.
  - `technicalLocation` (string): Device the problem is happening on.
  - `technicalSubCategory` (string): Subcategory of the issue.
  - `userEmail` (string): Contact email of the user.
  - `userName` (string): Contact name of the user.
- **Response**:
  - `200`: Data sent successfully.

##### N9 - Technical Problems

- **URL**: `/244cwdi`
- **Method**: `POST`
- **Description**: Zapier response for technical issues or content problem reporting.
- **Request Body**:
  - `now` (string, format: date-time): Timestamp of the session.
  - `technicalCategory` (string): Category key of the issue.
  - `technicalDate` (string): Date of the issue.
  - `technicalDescription` (string): Body of the problem.
  - `technicalLocation` (string): Device the problem is happening on.
  - `technicalSubCategory` (string): Subcategory of the issue.
  - `userEmail` (string): Contact email of the user.
  - `userName` (string): Contact name of the user.
- **Response**:
  - `200`: Data sent successfully.

##### N6 - Feedback & Suggestions

- **URL**: `/244ckhm`
- **Method**: `POST`
- **Description**: Zapier response for inquiries and feedback.
- **Request Body**:
  - `now` (string, format: date-time): Timestamp of the session.
  - `userEmail` (string): Contact email of the user.
  - `userName` (string): Contact name of the user.
  - `feedbackCategory` (string): Category key of the issue.
  - `feedbackDescription` (string): Body of the inquiry.
- **Response**:
  - `200`: Data sent successfully.

##### N9 - Feedback & Suggestions

- **URL**: `/244cagy`
- **Method**: `POST`
- **Description**: Zapier response for inquiries and feedback.
- **Request Body**:
  - `now` (string, format: date-time): Timestamp of the session.
  - `userEmail` (string): Contact email of the user.
  - `userName` (string): Contact name of the user.
  - `feedbackCategory` (string): Category key of the issue.
  - `feedbackDescription` (string): Body of the inquiry.
- **Response**:
  - `200`: Data sent successfully.

##### N6 - Advertising Inquiry

- **URL**: `/2u3yvfb`
- **Method**: `POST`
- **Description**: Zapier response for inquiries and feedback.
- **Request Body**:
  - `adCompany` (string): Company name of the advertising inquirer.
  - `adDescription` (string): Description of the service/goods provided by the advertising inquirer's company.
  - `userEmail` (string): Contact email of the advertising inquirer.
  - `userName` (string): Name of the advertising inquirer.
  - `adPhone` (number): Contact phone number of the advertising inquirer.
  - `now` (string, format: date-time): Timestamp of the session.
- **Response**:
  - `200`: Data sent successfully.

##### N9 - Advertising Inquiry

- **URL**: `/244caam`
- **Method**: `POST`
- **Description**: Zapier response for inquiries and feedback.
- **Request Body**:
  - `adCompany` (string): Company name of the advertising inquirer.
  - `adDescription` (string): Description of the service/goods provided by the advertising inquirer's company.
  - `userEmail` (string): Contact email of the advertising inquirer.
  - `userName` (string): Name of the advertising inquirer.
  - `adPhone` (number): Contact phone number of the advertising inquirer.
  - `now` (string, format: date-time): Timestamp of the session.
- **Response**:
  - `200`: Data sent successfully.

##### Create Account ( NOT FUNCTIONAL )

- **URL**: `/create-account` ( NOT REAL ENDPOINT )
- **Method**: `POST`
- **Description**: Zapier response for creating a new account.
- **Request Body**:
  - `now` (string, format: date-time): Timestamp of the session.
  - `accountDOB` (number): MMDDYYYY birthdate/id PIN of the user.
  - `accountEmail` (string): Email of the new user's account.
  - `accountFirstName` (string): First name of the new user's account.
  - `accountLastName` (string): Last name of the new user's account.
  - `accountPhone` (number): Phone number of the new user's account (default is 0).
- **Response**:
  - `200`: Data sent successfully.

##### Authenticate User (NOT FUNCTIONAL)

- **URL**: `/auth-user` ( NOT REAL ENDPOINT )
- **Method**: `POST`
- **Description**: Zapier response for authenticating a user.
- **Request Body**:
  - `accountDOB` (number): MMDDYYYY birthdate/id PIN of the user.
  - `accountEmail` (string): Email of the user.
  - `accountCurrPasswd` (string): Old password of the user.
- **Response**:
  - `200`: Authentication result.
    - `status` (string): Authentication status, either "passed" or "failed".

##### Update Password (NOT FUNCTIONAL)

- **URL**: `/update-passwd` (NOT REAL ENDPOINT)
- **Method**: `POST`
- **Description**: Zapier response for updating existing user's password.
- **Request Body**:
  - `now` (string, format: date-time): Timestamp of the session.
  - `accountEmail` (string): Email of the user.
  - `accountNewPasswd` (string): New password of the user.
  - `accountCurrPasswd` (string): Old password of the user.
- **Response**:
  - `200`: Data sent successfully.

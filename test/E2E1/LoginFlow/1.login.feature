Feature: Pozytron - Super Admin/Admin Login

  Rule: I should be able to login using registered email ID and Password and be redirected to the dashboard after successful login

    @Logout
    Example: John as Super Admin successfully logs in with valid credentials and OTP and is redirected to the dashboard
      Given John is on the login page
      When John enters valid login credentials "pozytron.test@gmail.com" and "Admin@1234"
      And John submits the login form
      And John enters the OTP "999999"
      And John submits the OTP
      Then John should be redirected to the dashboard page

  Rule: If invalid email address and password is entered then error message should be displayed

    @Logout
    Scenario Outline: <persona> sees an error message when entering invalid login credentials
      Given <persona> is on the login page
      When <persona> enters login credentials "<email>" and "<password>"
      And <persona> submits the login form
      Then <persona> should see the invalid credentials error message

      Examples:
        | persona | email                    | password      |
        | Maria   | invalid.user@example.com | Admin@1234    |
        | Alex    | pozytron.test@gmail.com  | WrongPass@123 |

  Rule: All the fields are mandatory

    @Logout
    Example: Sara sees validation errors when submitting the login form with empty fields
      Given Sara is on the login page
      When Sara submits the login form without filling in any fields
      Then Sara should see mandatory field validation messages

  Rule: Once the registered email ID and Password has been entered OTP will be sent to the registered email ID

    @Logout
    Example: Nina as Admin sees the OTP entry screen after entering valid credentials
      Given Nina is on the login page
      When Nina enters valid login credentials "pozytron.test@gmail.com" and "Admin@1234"
      And Nina submits the login form
      Then Nina should see the OTP entry screen

  Rule: Error message should be displayed in case of invalid OTP

    @Logout
    Example: Priya as Admin sees an error when entering an incorrect OTP
      Given Priya is on the login page
      When Priya enters valid login credentials "pozytron.test@gmail.com" and "Admin@1234"
      And Priya submits the login form
      And Priya enters the OTP "000000"
      And Priya submits the OTP
      Then Priya should see the invalid OTP error message

  Rule: Resend OTP should be enabled after 60 seconds

    @Logout
    Example: Carlos as Super Admin sees the Resend OTP button disabled immediately on the OTP screen
      Given Carlos is on the login page
      When Carlos enters valid login credentials "pozytron.test@gmail.com" and "Admin@1234"
      And Carlos submits the login form
      Then Carlos should see the Resend OTP button is disabled

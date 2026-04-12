Feature: Pozytron - Super Admin/Admin - Login

  Rule: A registered Super Admin can log in with valid credentials and OTP and be redirected to the dashboard

    @Logout
    Example: Maria as Super Admin logs in successfully with valid credentials and OTP
      Given Maria is on the login page
      When Maria enters email "pozytron.test@gmail.com" and password "Admin@1234"
      And Maria submits the login form
      And Maria enters the valid OTP
      And Maria submits the OTP
      Then Maria should be redirected to the dashboard page

  Rule: An invalid email address or password must display an error message

    @Logout
    Scenario Outline: <Persona> sees an error message when entering invalid login credentials
      Given <Persona> is on the login page
      When <Persona> enters email "<email>" and password "<password>"
      And <Persona> submits the login form
      Then <Persona> should see the invalid credentials error message

      Examples:
        | Persona | email                    | password    |
        | John    | invalid@example.com      | Admin@1234  |
        | Maria   | pozytron.test@gmail.com  | WrongPass@1 |

  Rule: All mandatory fields must be filled before the login form can be submitted

    @Logout
    Example: Sam sees validation errors when submitting the login form with empty fields
      Given Sam is on the login page
      When Sam submits the login form without entering any credentials
      Then Sam should see the mandatory field validation errors

  Rule: An invalid OTP must display an error message

    @Logout
    Example: Alex as Super Admin sees an error message after entering an incorrect OTP
      Given Alex is on the login page
      When Alex enters email "pozytron.test@gmail.com" and password "Admin@1234"
      And Alex submits the login form
      And Alex enters OTP "000000"
      And Alex submits the OTP
      Then Alex should see the invalid OTP error message

  Rule: The Resend OTP option allows a new OTP to be requested

    @Logout
    Example: Alex as Super Admin resends OTP and logs in successfully with the new code
      Given Alex is on the login page
      When Alex enters email "pozytron.test@gmail.com" and password "Admin@1234"
      And Alex submits the login form
      And Alex clicks the Resend OTP link
      And Alex enters the valid OTP
      And Alex submits the OTP
      Then Alex should be redirected to the dashboard page

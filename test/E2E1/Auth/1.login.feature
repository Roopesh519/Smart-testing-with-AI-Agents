Feature: Super Admin/Admin Login — Pozytron

  Background:
    Given the login page is open

  Rule: The login screen displays Email ID and Password fields with a submit button

    Example: Alex as Super Admin sees the login form on page load
      Given the login page is open
      Then Alex should see the email input field
      And Alex should see the password input field
      And Alex should see the login submit button
      And Alex should see the forgot password link

  Rule: Valid credentials trigger a 6-digit OTP sent to the registered email

    Example: Alex as Super Admin submits valid credentials and reaches the OTP screen
      Given the login page is open
      When Alex enters valid email and password
      And Alex clicks the login button
      Then Alex should see the OTP verification screen
      And Alex should see the masked email address on the OTP screen
      And Alex should see 6 individual OTP input boxes

  Rule: Valid OTP grants access to the Dashboard

    Example: Alex as Super Admin enters a valid OTP and is redirected to the dashboard
      Given the login page is open
      When Alex enters valid email and password
      And Alex clicks the login button
      And Alex enters a valid OTP
      And Alex clicks the verify button
      Then Alex should be redirected to the dashboard
      And Alex should see the dashboard panel

  Rule: Invalid credentials display an error message

    Scenario Outline: <persona> receives an error for invalid credentials
      Given the login page is open
      When <persona> enters email "<email>" and password "<password>"
      And <persona> clicks the login button
      Then <persona> should see the invalid credentials error message

      Examples:
        | persona | email                    | password        |
        | Alex    | wrong@example.com        | WrongPass999!   |
        | Maria   | notregistered@test.com   | Admin@1234      |

  Rule: Empty mandatory fields show validation errors on submission

    Example: Alex as Super Admin submits the login form with both fields empty
      Given the login page is open
      When Alex clicks the login button
      Then Alex should see the required field error for the email field
      And Alex should see the required field error for the password field

    Example: Alex as Super Admin enters an invalid email format
      Given the login page is open
      When Alex enters email "notanemail" and password "Admin@1234"
      And Alex clicks the login button
      Then Alex should see the invalid email format error message

  Rule: Invalid OTP shows an error message

    Example: Alex as Super Admin enters a wrong OTP and sees an error
      Given the login page is open
      When Alex enters valid email and password
      And Alex clicks the login button
      And Alex enters an invalid OTP "111111"
      And Alex clicks the verify button
      Then Alex should see the invalid OTP error message

  Rule: Forgot password link navigates to the password reset page

    Example: Alex as Super Admin clicks the forgot password link
      Given the login page is open
      When Alex clicks the forgot password link
      Then Alex should be on the forgot password page
      And Alex should see the password reset form

  Rule: Resend OTP option is disabled initially and becomes enabled after 60 seconds

    Example: Alex as Super Admin sees resend OTP is active on the OTP screen
      Given the login page is open
      When Alex enters valid email and password
      And Alex clicks the login button
      Then Alex should see the resend OTP option on the OTP screen

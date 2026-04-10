Feature: User management — add user

  Rule: Super admin should be able to add a new user

    @add_user
    Example: John as super admin adds a new user and sees the success message
      Given John is on the add user page
      When John fills in all required user details
      And John submits the user form
      Then John should see the message "User added successfully."

    Example: John as super admin views the newly created user in the list
      Given John is on the user listing page
      When John searches for the recently added user
      Then John should be able to view the details of the added user

  Rule: Super admin should not be able to add a user with a duplicate email

    Example: John as super admin attempts to add a user with an existing email
      Given John is on the add user page
      When John fills in the form with an already registered email
      And John submits the user form
      Then John should see the message "Email already exists."

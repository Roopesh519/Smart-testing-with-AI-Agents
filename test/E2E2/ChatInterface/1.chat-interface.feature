Feature: Ask questions through a chat interface

  Background:
    Given Alex is logged into the Pherix workspace

  Rule: Chat interface accepts free-form text input and returns relevant text responses

    Example: Alex as a workspace user submits a natural language question
      Given Alex is on the Core chat page
      When Alex submits the query "What are the key requirements for the ShopNest platform?"
      Then Alex should receive a relevant text response
      And the response should contain only text content

    Example: Alex as a workspace user sees a typing indicator while the response loads
      Given Alex is on the Core chat page
      When Alex submits the query "List all epics for this workspace"
      Then Alex should see a typing indicator while the response is being generated
      And Alex should receive a relevant text response

  Rule: System handles multi-line queries with proper formatting maintained

    Example: Alex as a workspace user submits a multi-line question
      Given Alex is on the Core chat page
      When Alex submits a multi-line query with two separate lines
      Then Alex should receive a response that addresses both lines of the query

  Rule: System shows appropriate message for queries outside workspace scope

    Example: Alex as a workspace user asks a question outside workspace scope
      Given Alex is on the Core chat page
      When Alex submits the query "What is the capital of France?"
      Then Alex should see an out-of-scope message redirecting to workspace topics

  Rule: Character limit of 5000 is enforced with a visible counter

    Example: Alex as a workspace user sees the character counter in the input box
      Given Alex is on the Core chat page
      When Alex types text into the query input
      Then Alex should see a character counter showing remaining limit out of 5000

    Example: Alex as a workspace user tries to exceed the 5000 character limit
      Given Alex is on the Core chat page
      When Alex attempts to enter a query longer than 5000 characters
      Then the input should not accept more than 5000 characters

  Rule: No file attachment option is available in the chat interface

    Example: Alex as a workspace user checks the chat input for attachment options
      Given Alex is on the Core chat page
      Then Alex should not see any file attachment or upload button

  Rule: System automatically creates a session subject line after the first query

    Example: Alex as a workspace user starts a new chat session
      Given Alex is on the Core chat page
      When Alex submits the query "Summarize the ShopNest epics"
      Then a new named session should appear in the chat history sidebar

  Rule: System maintains context across multiple related queries in a session

    Example: Alex as a workspace user asks a follow-up question referencing prior context
      Given Alex is on the Core chat page
      When Alex submits the query "What are the critical priority epics?"
      And Alex submits the follow-up query "Which of those has the most user stories?"
      Then Alex should receive a response that references the critical epics from the prior turn

  Rule: System prevents submission of empty queries and displays an appropriate message

    Example: Alex as a workspace user attempts to submit an empty query
      Given Alex is on the Core chat page
      When Alex attempts to submit an empty query
      Then Alex should see a validation message indicating the query cannot be empty

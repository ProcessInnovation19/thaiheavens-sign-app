# User Flow Documentation

## Overview

This document describes user journeys and flows for both administrators and guests using Mermaid diagrams.

## Admin User Journey

```mermaid
journey
    title Admin User Journey
    section Upload PDF
      Open Admin Page: 5: Admin
      Click New Session: 5: Admin
      Upload PDF File: 4: Admin
      PDF Uploaded: 5: Admin
    section Position Signature
      View PDF: 5: Admin
      Navigate Pages: 4: Admin
      Click Position: 5: Admin
      Adjust Box: 4: Admin
      Position Set: 5: Admin
    section Create Session
      Enter Guest Info: 4: Admin
      Create Session: 5: Admin
      Copy Signing Link: 5: Admin
      Send to Guest: 5: Admin
    section Manage Sessions
      View Sessions List: 4: Admin
      Download Signed PDF: 5: Admin
      Delete Session: 3: Admin
```

### Admin Flow Steps

1. **Upload PDF**
   - Navigate to admin page
   - Click "New Session"
   - Upload PDF (drag & drop or file picker)
   - Wait for upload confirmation

2. **Position Signature**
   - PDF displays automatically
   - Navigate to target page
   - Click where signature should appear
   - Drag/resize signature box if needed
   - Click "Continue"

3. **Create Session**
   - Enter guest name (optional)
   - Enter guest email (optional)
   - Click "Create Signing Link"
   - Copy generated link
   - Send link to guest

4. **Manage Sessions**
   - View all sessions in table
   - Copy URL for existing sessions
   - Download signed PDFs when ready
   - Delete sessions if needed

---

## Guest User Journey

```mermaid
journey
    title Guest User Journey
    section Receive Link
      Receive Signing Link: 5: Guest
      Open Link in Browser: 5: Guest
      Page Loads: 5: Guest
    section Review Contract
      Read Contract: 5: Guest
      Navigate Pages: 4: Guest
      Understand Terms: 5: Guest
      Ready to Sign: 5: Guest
    section Draw Signature
      View Signature Canvas: 4: Guest
      Draw Signature: 5: Guest
      Clear if Needed: 3: Guest
      Signature Complete: 5: Guest
    section Apply Signature
      Click Apply Signature: 5: Guest
      Wait for Processing: 4: Guest
      View Preview: 5: Guest
    section Confirm
      Review Preview: 5: Guest
      Confirm Signature: 5: Guest
      Download PDF: 5: Guest
      Process Complete: 5: Guest
```

### Guest Flow Steps

1. **Receive Link**
   - Receive signing link from administrator
   - Open link in web browser (mobile or desktop)
   - Page loads with contract

2. **Review Contract**
   - Read contract carefully
   - Navigate through all pages
   - Understand terms and conditions
   - Scroll to signature section

3. **Draw Signature**
   - See signature canvas area
   - Draw signature with finger (mobile) or mouse (desktop)
   - Use guide line for alignment
   - Clear and redraw if needed

4. **Apply Signature**
   - Click "Apply Signature" button
   - Wait for signature to be applied
   - View preview of signed contract

5. **Confirm**
   - Review preview carefully
   - Click "Confirm & Download"
   - PDF downloads automatically
   - See confirmation message

---

## Complete Admin Flow Diagram

```mermaid
flowchart TD
    A[Admin Opens App] --> B[View Sessions List]
    B --> C{Action?}
    C -->|New Session| D[Upload PDF]
    C -->|View Session| E[Session Details]
    C -->|Download| F[Download PDF]
    C -->|Delete| G[Delete Session]
    
    D --> H[PDF Uploaded]
    H --> I[Select Signature Position]
    I --> J[Click on PDF]
    J --> K[Signature Box Appears]
    K --> L{Adjust?}
    L -->|Yes| M[Drag/Resize Box]
    M --> K
    L -->|No| N[Continue]
    N --> O[Enter Guest Info]
    O --> P[Create Session]
    P --> Q[Copy Signing Link]
    Q --> R[Send to Guest]
    R --> B
    
    E --> B
    F --> B
    G --> B
```

### Admin Flow Details

**Main Actions:**
- Create new signing session
- View existing sessions
- Download signed PDFs
- Delete sessions
- Copy signing links

**Signature Positioning:**
- Interactive box positioning
- Drag to move
- Resize from corners
- Real-time coordinate updates

---

## Complete Guest Flow Diagram

```mermaid
flowchart TD
    A[Guest Receives Link] --> B[Open Link]
    B --> C[Page Loads]
    C --> D[View Contract]
    D --> E{Read Complete?}
    E -->|No| F[Navigate Pages]
    F --> D
    E -->|Yes| G[Scroll to Signature]
    G --> H[Draw Signature]
    H --> I{Signature OK?}
    I -->|No| J[Clear Signature]
    J --> H
    I -->|Yes| K[Apply Signature]
    K --> L[Processing...]
    L --> M[View Preview]
    M --> N{Preview OK?}
    N -->|No| O[Clear & Sign Again]
    O --> H
    N -->|Yes| P[Confirm Signature]
    P --> Q[Download PDF]
    Q --> R[Complete]
```

### Guest Flow Details

**Contract Review:**
- PDF viewer with page navigation
- Read-only mode
- Mobile-friendly interface

**Signature Process:**
- Touch/mouse support
- Visual guide line
- Clear functionality
- Preview before confirmation

**Confirmation:**
- Preview signed PDF
- Download option
- Final confirmation

---

## Mobile User Flow

```mermaid
flowchart TD
    A[Mobile User] --> B[Open Link]
    B --> C[Touch-Friendly Interface]
    C --> D[Swipe to Navigate PDF]
    D --> E[Touch to Draw Signature]
    E --> F[Large Signature Canvas]
    F --> G[Apply Signature]
    G --> H[Preview on Mobile]
    H --> I[Confirm & Download]
    I --> J[PDF Saved to Device]
```

### Mobile-Specific Features

- **Touch Support:** Full touch event handling
- **Responsive Design:** Adapts to screen size
- **Large Buttons:** Easy to tap
- **Canvas Sizing:** Responsive signature area
- **Download:** Works with mobile browsers

---

## Error Flow - Invalid Link

```mermaid
flowchart TD
    A[Guest Opens Link] --> B{Link Valid?}
    B -->|No| C[Display Error]
    C --> D["Error: Link invalid or expired"]
    D --> E[Contact Administrator]
    E --> F[End]
    B -->|Yes| G[Load Session]
    G --> H[Continue Flow]
```

### Error Handling

**Invalid Link:**
- Clear error message
- Instructions to contact admin
- No further actions possible

**Other Errors:**
- Network errors: Retry option
- PDF loading errors: Refresh page
- Signature errors: Clear and retry

---

## Calibration Flow

```mermaid
flowchart TD
    A[Admin Opens Calibrate] --> B[Upload Test PDF]
    B --> C[PDF Loads]
    C --> D[Click Position]
    D --> E[Test Box Appears]
    E --> F[Adjust Parameters]
    F --> G{Test?}
    G -->|Yes| H[Generate Test PDF]
    H --> I[View Result]
    I --> J{Correct?}
    J -->|No| F
    J -->|Yes| K[Use Parameters]
    G -->|No| F
```

### Calibration Process

1. Upload test PDF
2. Click to position signature box
3. Adjust offset and scale parameters
4. Generate test PDF
5. Verify placement
6. Adjust if needed
7. Use calibrated parameters

---

## Session Status Flow

```mermaid
stateDiagram-v2
    [*] --> Pending: Admin Creates Session
    Pending --> Signed: Guest Applies Signature
    Signed --> Completed: Guest Confirms
    Signed --> Signed: Guest Re-signs
    Completed --> [*]: Final State
    
    note right of Pending
        Session created
        Link sent to guest
        Waiting for signature
    end note
    
    note right of Signed
        Signature applied
        Preview available
        Awaiting confirmation
    end note
    
    note right of Completed
        Signature confirmed
        PDF ready for download
        Process complete
    end note
```

### Status Transitions

- **Pending → Signed:** Guest applies signature
- **Signed → Completed:** Guest confirms signature
- **Signed → Signed:** Guest re-signs (overwrites)

---

## User Interaction Patterns

### Admin Interactions

```mermaid
graph TB
    A[Admin] --> B[Upload PDF]
    A --> C[Position Signature]
    A --> D[Create Session]
    A --> E[Manage Sessions]
    
    B --> F[Drag & Drop]
    B --> G[File Picker]
    
    C --> H[Click PDF]
    C --> I[Drag Box]
    C --> J[Resize Box]
    
    D --> K[Enter Guest Info]
    D --> L[Generate Link]
    
    E --> M[View List]
    E --> N[Copy URL]
    E --> O[Download PDF]
    E --> P[Delete Session]
```

### Guest Interactions

```mermaid
graph TB
    A[Guest] --> B[View Contract]
    A --> C[Draw Signature]
    A --> D[Preview]
    A --> E[Confirm]
    
    B --> F[Navigate Pages]
    B --> G[Read Content]
    
    C --> H[Touch/Mouse Draw]
    C --> I[Clear Signature]
    
    D --> J[Review Placement]
    D --> K[Check Appearance]
    
    E --> L[Download PDF]
    E --> M[See Confirmation]
```

---

## User Experience Flow

```mermaid
graph LR
    A[Landing] --> B[Action Required]
    B --> C[Feedback]
    C --> D[Result]
    D --> E{Success?}
    E -->|Yes| F[Next Step]
    E -->|No| G[Error Handling]
    G --> B
    F --> H[Complete]
```

### UX Principles

1. **Clear Actions:** Large, obvious buttons
2. **Immediate Feedback:** Loading states, success messages
3. **Error Recovery:** Clear error messages, retry options
4. **Progress Indication:** Show current step
5. **Mobile First:** Touch-friendly interface

---

## Notes for Developers

### User Flow Implementation

**Key Considerations:**
- **Progressive Disclosure:** Show only what's needed
- **Error Prevention:** Validate before submission
- **Feedback:** Always provide user feedback
- **Accessibility:** Support keyboard navigation
- **Mobile:** Touch events for all interactions

### Flow States

**Admin States:**
- Sessions list
- Upload PDF
- Position signature
- Create session
- Manage sessions

**Guest States:**
- View contract
- Draw signature
- Preview signed
- Confirm and download

---

## Notes for AI Regeneration

### Required User Flows

1. **Admin Flow:**
   - Upload → Position → Create → Manage

2. **Guest Flow:**
   - Receive → Review → Sign → Preview → Confirm

3. **Error Flows:**
   - Invalid link
   - Network errors
   - Validation errors

### Flow Requirements

**Always:**
- Provide clear next steps
- Show loading states
- Handle errors gracefully
- Support mobile devices
- Give user feedback

**Never:**
- Skip validation
- Leave user without feedback
- Block on errors
- Assume desktop only

---

## User Journey Maps

### Admin Journey Map

```mermaid
journey
    title Admin Complete Journey
    section Discovery
      Learn about system: 3: Admin
      Access admin page: 5: Admin
    section Setup
      Upload first PDF: 4: Admin
      Position signature: 4: Admin
      Create first session: 5: Admin
    section Usage
      Create multiple sessions: 5: Admin
      Manage sessions: 4: Admin
      Download signed PDFs: 5: Admin
    section Mastery
      Use calibration tool: 4: Admin
      Optimize workflow: 5: Admin
```

### Guest Journey Map

```mermaid
journey
    title Guest Complete Journey
    section Receipt
      Receive link: 5: Guest
      Understand purpose: 4: Guest
    section Review
      Open link: 5: Guest
      Read contract: 5: Guest
      Understand terms: 4: Guest
    section Signing
      Draw signature: 5: Guest
      Apply signature: 5: Guest
      Preview result: 5: Guest
    section Completion
      Confirm signature: 5: Guest
      Download PDF: 5: Guest
      Save for records: 4: Guest
```

---

## Conclusion

This document provides complete user flow documentation for:
- **Admin flows:** Session creation and management
- **Guest flows:** Contract signing process
- **Error flows:** Error handling and recovery
- **Mobile flows:** Touch-optimized interactions
- **Status flows:** Session state transitions

Use these flows to understand user behavior and optimize the user experience.



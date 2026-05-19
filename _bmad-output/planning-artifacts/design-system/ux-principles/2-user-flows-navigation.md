# 2. User Flows & Navigation

## 2.1 Authentication Flow

```mermaid
graph TD
    A[App Launch] --> B{Is Authenticated?}
    B -->|No| C[Login Screen]
    B -->|Yes| D{Has Multiple Roles?}
    C --> E[Authenticate]
    E --> D
    D -->|Yes| F[Role Selection]
    D -->|No| G[Default Role Dashboard]
    F --> H[Selected Role Dashboard]
```

**Implementation Notes:**
- JWT stored in secure httpOnly cookie
- Role context in Zustand store
- Persistent role selection in localStorage
- Automatic role restoration on app restart

## 2.2 Role-Based Navigation Structure

### Assessor Navigation
```
/assessor
├── /dashboard          # Overview & queue
├── /assessments
│   ├── /new           # Create new assessment
│   ├── /preliminary   # Preliminary assessments
│   └── /rapid         # Rapid assessments (6 types)
├── /entities          # Assigned entities
└── /sync             # Sync status & queue
```

### Coordinator Navigation
```
/coordinator
├── /dashboard         # Crisis Management Dashboard
├── /verification
│   ├── /assessments  # Assessment queue
│   └── /responses    # Response queue
├── /incidents        # Incident management
├── /entities         # Entity assignment
├── /monitoring       # Situation Awareness Dashboard
└── /settings        # Auto-approval config
```

### Responder Navigation
```
/responder
├── /dashboard        # Overview & assignments
├── /responses
│   ├── /planned     # Planning interface
│   └── /delivered   # Delivery documentation
├── /entities        # Assigned entities
└── /imports        # Donor commitment imports
```

### Donor Navigation
```
/donor
├── /dashboard       # Performance & leaderboard
├── /commitments    # Commitment management
├── /entities       # Entity insights
└── /reports       # Performance reports
```

## 2.3 Core User Flows

### Assessment Creation Flow
```mermaid
graph LR
    A[Select Entity] --> B[Choose Assessment Type]
    B --> C[Fill Form Offline]
    C --> D[Capture GPS/Media]
    D --> E[Local Validation]
    E --> F[Save to IndexedDB]
    F --> G[Queue for Sync]
    G --> H{Online?}
    H -->|Yes| I[Sync to Server]
    H -->|No| J[Show in Queue]
```

### Response Planning to Delivery Flow
```mermaid
graph LR
    A[View Assessment] --> B[Plan Response]
    B --> C[Import Donor Items]
    C --> D[Save as Planned]
    D --> E[Execute Delivery]
    E --> F[Document Delivery]
    F --> G[Convert to Delivered]
    G --> H[Submit for Verification]
```

export type RootStackParamList = {
    Settings: undefined;
    Camera: undefined;
    History: undefined;
    Employees: undefined;
    Enrollment: { employeeId?: string } | undefined;
    SyncStatus: undefined;
    ThirdPartyNotices: undefined;
    Main: undefined; // 👈 Add this
  };
  
  export type MainTabParamList = {
    Camera: undefined;
    History: undefined;
    Employees: undefined;
    Settings: undefined;
  };
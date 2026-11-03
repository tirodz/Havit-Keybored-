# Read-only KB874L HID descriptor query. This script never calls HidD_SetFeature,
# HidD_GetFeature, or any other report-transfer API.
$ErrorActionPreference = "Stop"

$source = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class Kb874lHidCapsReader {
  [StructLayout(LayoutKind.Sequential)] struct InterfaceData {
    public int Size; public Guid Guid; public int Flags; public IntPtr Reserved;
  }
  [StructLayout(LayoutKind.Sequential)] struct Caps {
    public ushort Usage, UsagePage, InputLength, OutputLength, FeatureLength;
    [MarshalAs(UnmanagedType.ByValArray, SizeConst=17)] public ushort[] Reserved;
    public ushort Links, InputButtons, InputValues, InputIndices;
    public ushort OutputButtons, OutputValues, OutputIndices;
    public ushort FeatureButtons, FeatureValues, FeatureIndices;
  }

  [DllImport("setupapi.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern IntPtr SetupDiGetClassDevs(ref Guid guid, IntPtr enumerator, IntPtr hwnd, uint flags);
  [DllImport("setupapi.dll", SetLastError=true)]
  static extern bool SetupDiEnumDeviceInterfaces(IntPtr set, IntPtr info, ref Guid guid, uint index, ref InterfaceData data);
  [DllImport("setupapi.dll", EntryPoint="SetupDiGetDeviceInterfaceDetailW", SetLastError=true)]
  static extern bool GetDetail(IntPtr set, ref InterfaceData data, IntPtr detail, uint size, out uint required, IntPtr info);
  [DllImport("setupapi.dll")] static extern bool SetupDiDestroyDeviceInfoList(IntPtr set);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern IntPtr CreateFile(string name, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("hid.dll", SetLastError=true)] static extern bool HidD_GetPreparsedData(IntPtr handle, out IntPtr data);
  [DllImport("hid.dll")] static extern bool HidD_FreePreparsedData(IntPtr data);
  [DllImport("hid.dll")] static extern int HidP_GetCaps(IntPtr data, out Caps caps);

  public static string[] Query() {
    Guid hidGuid = new Guid("4d1e55b2-f16f-11cf-88cb-001111000030");
    IntPtr set = SetupDiGetClassDevs(ref hidGuid, IntPtr.Zero, IntPtr.Zero, 0x12);
    if (set == new IntPtr(-1)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    var rows = new List<string>();
    try {
      for (uint index = 0; ; index++) {
        var item = new InterfaceData { Size = Marshal.SizeOf(typeof(InterfaceData)) };
        if (!SetupDiEnumDeviceInterfaces(set, IntPtr.Zero, ref hidGuid, index, ref item)) break;
        uint required;
        GetDetail(set, ref item, IntPtr.Zero, 0, out required, IntPtr.Zero);
        IntPtr detail = Marshal.AllocHGlobal((int)required);
        try {
          Marshal.WriteInt32(detail, IntPtr.Size == 8 ? 8 : 6);
          if (!GetDetail(set, ref item, detail, required, out required, IntPtr.Zero)) continue;
          string path = Marshal.PtrToStringUni(IntPtr.Add(detail, 4));
          if (path == null || !path.ToLowerInvariant().Contains("vid_05ac&pid_024f&mi_00#")) continue;
          IntPtr handle = CreateFile(path, 0x80000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero); // GENERIC_READ only
          if (handle == new IntPtr(-1)) {
            rows.Add("Open denied for MI_00 collection: Win32 error " + Marshal.GetLastWin32Error());
            continue;
          }
          try {
            IntPtr preparsed;
            if (!HidD_GetPreparsedData(handle, out preparsed)) {
              rows.Add("HidD_GetPreparsedData failed: Win32 error " + Marshal.GetLastWin32Error());
              continue;
            }
            try {
              Caps caps;
              int status = HidP_GetCaps(preparsed, out caps);
              rows.Add(String.Format("HidP_GetCaps=0x{0:X8}; UsagePage=0x{1:X4}; Usage=0x{2:X4}; Input={3}; Output={4}; Feature={5}",
                status, caps.UsagePage, caps.Usage, caps.InputLength, caps.OutputLength, caps.FeatureLength));
            } finally { HidD_FreePreparsedData(preparsed); }
          } finally { CloseHandle(handle); }
        } finally { Marshal.FreeHGlobal(detail); }
      }
    } finally { SetupDiDestroyDeviceInfoList(set); }
    return rows.ToArray();
  }
}
'@

Add-Type -TypeDefinition $source
$results = [Kb874lHidCapsReader]::Query()
if ($results.Count -eq 0) { Write-Output "No present VID_05AC&PID_024F MI_00 HID collection found." }
else { $results | ForEach-Object { Write-Output $_ } }

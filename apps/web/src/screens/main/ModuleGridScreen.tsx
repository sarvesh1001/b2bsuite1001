// import React, { useState } from 'react';
// import { useRouter } from 'next/router';
// import { FiLogOut, FiQrCode, FiMessageCircle } from 'react-icons/fi';
// import { useUserAuthStore } from '../../store/userAuthStore';
// import { logoutAllDevices } from '@b2b/api-client';
// import { MODULE_CONFIG } from '../../config/modules'; // you need to create this

// export default function ModuleGridScreen() {
//   const router = useRouter();
//   const { user, isAuthenticated, accessToken, deviceId, companyId, logout } = useUserAuthStore();
//   const accessibleModules = useModuleAccess(); // hook from utils/permissions (web version)

//   const handleLogout = async () => {
//     if (confirm('Log out from all devices?')) {
//       try {
//         if (accessToken && deviceId && companyId && user?.user_id) {
//           await logoutAllDevices(companyId, deviceId, user.user_id, accessToken);
//         }
//       } catch (e) {
//         console.error(e);
//       }
//       logout();
//       router.replace('/web/login');
//     }
//   };

//   if (!isAuthenticated) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
//       </div>
//     );
//   }

//   if (!accessibleModules.length) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
//         <h2 className="text-xl font-semibold text-gray-700">No modules available</h2>
//         <p className="text-gray-500 mt-2">Contact your administrator.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Header */}
//       <header className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
//         <h1 className="text-xl font-bold text-white">Modules</h1>
//         <div className="flex gap-3">
//           <button
//             onClick={() => router.push('/web/qr-scanner')}  // if you have a web qr scanner page, else remove
//             className="p-2 text-white hover:bg-blue-700 rounded-full"
//             title="QR Scanner"
//           >
//             <FiQrCode className="w-6 h-6" />
//           </button>
//           <button
//             onClick={handleLogout}
//             className="p-2 text-white hover:bg-blue-700 rounded-full"
//             title="Logout"
//           >
//             <FiLogOut className="w-6 h-6" />
//           </button>
//         </div>
//       </header>

//       {/* Welcome */}
//       <div className="px-6 pt-6">
//         <h2 className="text-2xl font-bold text-gray-800">
//           Welcome, {user?.full_name || user?.phone || 'User'}
//         </h2>
//         <p className="text-gray-600">Select a module to get started</p>
//       </div>

//       {/* Module grid */}
//       <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
//         {accessibleModules.map((moduleName) => {
//           const config = MODULE_CONFIG[moduleName] || {
//             icon: 'FiBox',
//             label: moduleName,
//             color: '#3B82F6',
//           };
//           const Icon = config.icon; // you'll need to map string to icon component
//           return (
//             <button
//               key={moduleName}
//               onClick={() => router.push(`/module/${moduleName}`)}
//               className="bg-white rounded-xl shadow-sm border-t-4 p-6 flex flex-col items-center hover:shadow-md transition border"
//               style={{ borderTopColor: config.color }}
//             >
//               <Icon className="w-12 h-12 mb-4" style={{ color: config.color }} />
//               <span className="text-gray-800 font-semibold">{config.label}</span>
//             </button>
//           );
//         })}
//       </div>

//       {/* Chat button */}
//       <button
//         onClick={() => router.push('/chat')}
//         className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-700"
//       >
//         <FiMessageCircle className="w-5 h-5" />
//         <span>Hi, I am a Prayantra Employee</span>
//       </button>
//     </div>
//   );
// }
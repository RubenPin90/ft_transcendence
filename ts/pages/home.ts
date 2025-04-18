
// export function renderHome(): string {
//    const script = document.createElement('script');
//    script.src="js/login.js";
//     document.body.appendChild(script);
//  return `
//  <div class="bubble top-10 left-10 w-40 h-40 from-fuchsia-500 via-pink-500 to-pink-500"></div>
//  <div class="bubble bottom-20 right-20 w-48 h-48 from-fuchsia-500 via-pink-500 to-pink-500"></div>
//  <div class="bubble top-1/2 left-1/2 w-24 h-24 from-pink-600 via-pink-600 to-fuchsia-600"></div>

//  <div id="toggle_login" class="fixed inset-0 flex items-center justify-center"> <!--TODO ADD TRANSITION-->
//      <!-- <div class="bg-gray-700 rounded-3xl p-10 lg:w-96 lg:h-[30rem] "> TODO fix for smaller devices CHANGE BG-COLLOR! MAKE IT TRANSPARRENT LIKE GLASS ADD SHADDOW -->
//           <dv class="bg-gray-600 rounded-3xl p-10 mx-5 bg-clip-padding backdrop-filter backdrop-blur-xl bg-opacity-30 border-white border-r border-l border-b shadow-xl shadow-black"> <!--TODO fix for smaller devices CHANGE BG-COLLOR! MAKE IT TRANSPARRENT LIKE GLASS ADD SHADDOW-->
//          <div class="flex justify-between">
//              <h3 class="font-bold text-xl ">Login</h3>
//              <button onclick="toggle_login()" class=" border border-white rounded-lg items-center justify-center bg-red-800/70 text-white font-bold h-7 text-center aspect-square text-xl">
//                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
//                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
//                  </svg>
//               </utton>
//          </div>
//          <input id="email-input"  type="text" placeholder="E-Mail" required id="E-Mail" name="E-Mail" class="rounded-xl border-solid border-2 border-violet-800 py-3 text-black text-center mt-11 mb-3 w-full">
//          <input id="password-input" type="text" placeholder="Password" required id="Password" name="Password" class="rounded-xl border-solid border-2 border-violet-800 py-3 text-black text-center w-full">
//          <div class="h-full pt-6"> <!--TODO position flexboxes correctly give appropriate collors and manipulate html-->
//               <dv class="flex justify-center">
//                  <button type="button" onclick="login()" class="border border-[#000000]">Login</button>
//              </div>

//              <div class="w-full mt-4">
//                  <div class="w-7/8">
//                       <btton type="button" class="text-white bg-[#221f1f] border border-[#221f1f] font-medium rounded-xl text-lg px-5 py-2.5 text-center inline-flex items-center me-2 mb-2 w-full">
//                          <svg class="w-5 h-5 me-2 mr-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
//                              <path fill-rule="evenodd" d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z" clip-rule="evenodd"/>
//                          </svg>
//                          Log in with Github
//                      </button>
//                  </div>
//                   <dv class="w-7/8">
//                      <button type="button" class="text-white bg-[#1973e7] font-medium rounded-xl text-lg px-5 py-2.5 text-center inline-flex items-center me-2 mb-2 border border-spacing-4 w-full">
//                          <svg class="w-5 h-5 me-2 mr-4 bg-white rounded-xl" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
//                              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
//                          </svg>
//                       Lo in with Google
//                  </button>
//              </div>
//              </div>
//              <div class="pt-8 font-bold">
//                  <span>Don't have an account?</span>
//                  <a href="#" class="text-blue-600">Sign up</a>
//              </div>
//          </div>
//      </div>
//   </div>

//  <div id="main_button" class="flex items-center justify-center h-screen relative hidden">
//      <button id="login-button" claonclick="toggle_login()" ss="border-black border border-spacing-1 bg-red-400 lg:p-4 sm:p-4 md:p-4 lg:text-6xl sm:text-4xl rounded-lg">Login</button>  <!--TODO ADD CUSTOM FONT-->
//  </div>

//   `;
// }

export async function renderHome() : Promise<string> {
    const script = document.createElement('script');
    script.src="js/login.js";
    document.body.appendChild(script);
    const res = await fetch('/views/home.html');
    const ret = await res.text();

    return ret;
}


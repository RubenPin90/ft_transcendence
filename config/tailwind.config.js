 /* @type {import('tailwindcss').Config} */
export default {
   content: ["../scripts/login/*.js", "../templates/*.html", "*.html", "*.js", "../js/**/*.{js,ts}", "../ts/**/*.ts", "../views/*.{html,ts}"],
   theme: {
     extend: {
      colors: {
        darkPurple: '#24152c',
        darkRed: '#291515',
        darkPink: '#22112c',
      },
      keyframes: {
        shaking: {
          "0%": {
            transform: "translateX(6px)",
          },
          "50%": {
            transform: "translateX(-6px)",
          },
          "75%": {
            transform: "translateX(6px)",
          },
          },
          "100%": {
            transform: "translateX(-6px)",
          },

          open_up: {
            "0%": {
              transform: "translateX(-6px)"
            },
          },
        },
      },
      animation: {
          "wrong_input" : "shaking 0.3s linear 1 ",
          "open_login" : "open_up 1 linear 1 ",
      },
     },

   plugins: [],
}

 /* @type {import('tailwindcss').Config} */
export default {
   content: ["./frontend/", "./frontend/css/*.css", "./frontend/client/js/*.js", "./frontend/client/ts/*.ts", "./backend/*.js", "./backend/templates/*.html", "./backend/**/*.js", "./backend/*.js", "./database/*.js"],
   theme: {
     extend: {
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

        },
      },
      animation: {
          "wrong_input" : "shaking 0.3s linear 1 ",
          "loader" : "spin 1s linear infinite",
      },
     },

   plugins: [],
}

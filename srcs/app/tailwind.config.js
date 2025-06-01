 /* @type {import('tailwindcss').Config} */
export default {
   content: ["./frontend/", "./frontend/css/*.css", "./frontend/client/js/*.js", "./frontend/client/ts/*.ts", "./backend/*.js", "./backend/templates/*.html", "./backend/**/*.js", "./backend/*.js", "./database/*.js"],
   theme: {
     extend: {
      boxShadow: {
        'strong': '0 10px 20px rgba(0, 0, 0, 0.5), 0 -5px 10px rgba(0, 0, 0, 0.3)',
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

        },
      },
      animation: {
          "wrong_input" : "shaking 0.3s linear 1 ",
      },
     },

   plugins: [],
}

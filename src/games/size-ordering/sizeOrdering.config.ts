import { SizeCategory } from "./sizeOrdering.types";

export const CATEGORIES: SizeCategory[] = [
  {
    name: "Fruit",
    items: [
      {
        name: "Apple",
        image: require("../../../assets/images/games/cognitive/size_ordering/apple.jpg"),
        color: "#ef4444",
      },
      {
        name: "Banana",
        image: require("../../../assets/images/games/cognitive/size_ordering/banana.jpg"),
        color: "#eab308",
      },
      {
        name: "Watermelon",
        image: require("../../../assets/images/games/cognitive/size_ordering/watermelon.jpg"),
        color: "#22c55e",
      },
    ],
  },
  {
    name: "Toys",
    items: [
      {
        name: "Car",
        image: require("../../../assets/images/games/cognitive/size_ordering/car.jpg"),
        color: "#3b82f6",
      },
      {
        name: "Ball",
        image: require("../../../assets/images/games/cognitive/size_ordering/ball.jpg"),
        color: "#ef4444",
      },
      {
        name: "Teddy Bear",
        image: require("../../../assets/images/games/cognitive/size_ordering/teddy.jpg"),
        color: "#b45309",
      },
      {
        name: "Robot",
        image: require("../../../assets/images/games/cognitive/size_ordering/robot.jpg"),
        color: "#6366f1",
      },
    ],
  },
  {
    name: "Nature",
    items: [
      {
        name: "Sun",
        image: require("../../../assets/images/games/cognitive/size_ordering/sun.jpg"),
        color: "#f59e0b",
      },
      {
        name: "Cloud",
        image: require("../../../assets/images/games/cognitive/size_ordering/cloud.jpg"),
        color: "#38bdf8",
      },
      {
        name: "Star",
        image: require("../../../assets/images/games/cognitive/size_ordering/star.jpg"),
        color: "#eab308",
      },
    ],
  },
  {
    name: "Emotions",
    items: [
      {
        name: "Happy",
        image: require("../../../assets/images/games/cognitive/emotions/happy.jpg"),
        color: "#facc15",
      },
      {
        name: "Sad",
        image: require("../../../assets/images/games/cognitive/emotions/sad.jpg"),
        color: "#3b82f6",
      },
      {
        name: "Angry",
        image: require("../../../assets/images/games/cognitive/emotions/angry.jpg"),
        color: "#ef4444",
      },
      {
        name: "Loved",
        image: require("../../../assets/images/games/cognitive/emotions/loving.jpg"),
        color: "#f472b6",
      },
    ],
  },
];

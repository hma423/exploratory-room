import mediapipe as mp 
import cv2 
import math
import numpy as np 


print("************************** START OF PROGRAM ****************************")
print("\n\npress q to quit\n")
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1200)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1200)

hands = mp.solutions.hands
hand = hands.Hands()
drawing = mp.solutions.drawing_utils


while True:
    success, frame = cap.read()
    if success:
        RGB_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hand.process(RGB_frame)
        
        if result.multi_hand_landmarks:
            for landmark in result.multi_hand_landmarks:
                h, w, _ = frame.shape
                thumb_tip = landmark.landmark[4]
                pointer_finger_tip = landmark.landmark[8]

                # pointer_vector = np.array([int(landmark.landmark[0] * w), int(landmark.landmark[5] * h)])
                # pinky_vector  = np.array([int(landmark.landmark[0] * w), int(landmark.landmark[17] * h)])


                # Wrist coordinates
                wrist_x = int(landmark.landmark[0].x * w)
                wrist_y = int(landmark.landmark[0].y * h)

                # Pointer MCP (index finger base)
                pointer_x = int(landmark.landmark[5].x * w)
                pointer_y = int(landmark.landmark[5].y * h)

                # Pinky MCP (pinky finger base)
                pinky_x = int(landmark.landmark[17].x * w)
                pinky_y = int(landmark.landmark[17].y * h)

                # Draw lines
                cv2.line(frame, (wrist_x, wrist_y), (pointer_x, pointer_y), (0, 255, 255), 2)
                cv2.line(frame, (wrist_x, wrist_y), (pinky_x, pinky_y), (255, 0, 255), 2)


                normalized_thumb = (int (thumb_tip.x * w) , int (thumb_tip.y * h))
                normalized_pointer = (int ( pointer_finger_tip.x * w) , int ( pointer_finger_tip.y * h))

                if math.dist(normalized_thumb, normalized_pointer) < 80:
                    mid_x, mid_y = (normalized_thumb[0] + normalized_pointer[0]) // 2, (normalized_thumb[1] + normalized_pointer[1]) // 2
                    cv2.circle(frame, (mid_x, mid_y), 15, (0, 0, 255), -1)  # Red dot for pinch
                    cv2.putText(frame, 'Pinching', (mid_x - 30, mid_y - 30), cv2.FONT_HERSHEY_SIMPLEX, 
                                0.6, (0, 0, 255), 2)

        cv2.imshow("capture image", frame)
        if cv2.waitKey(1)  == ord('q'):
            break
    else:
        print("no sucess ")




cap.release()
cv2.destroyAllWindows()
print("FINISHED")


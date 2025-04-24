from flask import Flask, request, jsonify, render_template
import openai
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)

# Your OpenAI API Key
openai.api_key = 'Your own API Key...'


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()
    # Dialogue history sent from the frontend
    messages = data.get('history', [])

    styles = [
        {
            "system_prompt": "You are a helpful assistant providing a normal, balanced viewpoint.",
            "temperature": 0.7
        },
        {
            "system_prompt": "You are a critical, questioning assistant that challenges assumptions.",
            "temperature": 1.0
        },
        {
            "system_prompt": "You are a provocative and imaginative assistant exploring out-of-the-box ideas.",
            "temperature": 1.2
        }
    ]

    all_replies = []

    for style in styles:
        # For each branch, reconstruct a new messages list, starting with a unique system message
        styled_messages = []
        styled_messages.append({"role": "system", "content": style["system_prompt"]})
        # Then append the user/assistant dialogue history
        styled_messages.extend(messages)

        # Call ChatCompletion
        try:
            response = openai.chat.completions.create(
                model="gpt-4-turbo",              # Use GPT-4
                messages=styled_messages,
                max_tokens=150,
                temperature=style["temperature"],  
                n=1  # Only one reply per branch
            )
            # Extract assistant's reply
            content = response.choices[0].message.content
            all_replies.append(content)
        except Exception as e:
            # Handle error if occurs
            all_replies.append(f"Error: {str(e)}")

    # One request => returns results from three branches
    return jsonify(all_replies)


@app.route('/generate_image', methods=['POST'])
def generate_image():
    data = request.get_json()
    prompt = data.get('prompt', '')
    try:
        # Call DALL·E 3 or openai.Image.create (if access is available)
        response = openai.images.generate(
            prompt=prompt,
            n=1,
            size='512x512'  # Adjustable
        )
        response_dict = response.to_dict()
        image_url = response_dict['data'][0]['url']
        return jsonify({"url": image_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    conversation_data = data.get('conversationData', [])

    # If no conversationData is provided
    if not conversation_data:
        return jsonify({"error": "No conversation data provided"}), 400

    combined_text = ""
    for branch in conversation_data:
        unit_idx = branch.get('unitIndex', '')
        messages = branch.get('messages', [])
        combined_text += f"--- Sub-branch: {unit_idx} ---\n"
        for msg in messages:
            role = msg.get('role', 'user').capitalize()
            content = msg.get('content', '')
            combined_text += f"{role}: {content}\n"
        combined_text += "\n"

    system_prompt = "You are an AI that summarizes multi-branch conversations in a concise manner."
    user_prompt = (
        "Here is the entire conversation, with multiple sub-branches. "
        "Each sub-branch is labeled by unitIndex. "
        "Please provide a concise but thorough summary highlighting key divergences, important insights, and relevant details:\n\n"
        + combined_text
    )

    try:
        response = openai.chat.completions.create(
            model="gpt-4-turbo",  # or "gpt-3.5-turbo", etc.
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        summary = response.choices[0].message.content.strip()
        return jsonify({"summary": summary})
    except Exception as e:
        # Catch exception and return detailed error info
        print(f"Error in summarize: {str(e)}")
        return jsonify({"error": f"Failed to generate summary: {str(e)}"}), 500



if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
# if __name__ == '__main__':
#     app.run(debug=True, host = '10.3.0.16', port = '5001')
